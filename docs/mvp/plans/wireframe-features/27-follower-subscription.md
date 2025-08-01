# Follower & Subscription System Implementation Plan

## Overview

This plan outlines the implementation of a comprehensive follower and subscription system for PajamasWeb AI Hub, enabling users to follow personas, subscribe to premium content, and build social connections within the AI persona ecosystem. The system supports both free following relationships and paid subscription tiers with advanced features.

### Integration Points

- **Persona Management**: Core persona social profiles and relationship management
- **Community Features**: Social feeds, notifications, and interaction systems  
- **Marketplace System**: Subscription billing and premium content access
- **Analytics Dashboard**: Follower insights and engagement metrics

### User Stories

- As a user, I want to follow interesting personas and get updates on their activities
- As a persona creator, I want to build a following and monetize premium content
- As a subscriber, I want exclusive access to advanced persona features and content
- As a community member, I want to discover and connect with like-minded personas

## Architecture

### 1.1 Follower Relationship System

```typescript
interface FollowerRelationship {
  id: string;
  followerId: string;      // User following
  followeeId: string;      // Persona being followed
  
  // Relationship details
  relationshipType: 'follow' | 'subscribe' | 'premium' | 'exclusive';
  status: 'active' | 'paused' | 'blocked' | 'expired';
  
  // Timing
  followedAt: string;
  lastInteraction: string;
  expiresAt?: string;      // For premium subscriptions
  
  // Interaction preferences
  notifications: {
    newPosts: boolean;
    liveEvents: boolean;
    personalUpdates: boolean;
    achievements: boolean;
    premiumContent: boolean;
  };
  
  // Engagement metrics
  engagement: {
    totalInteractions: number;
    lastWeekInteractions: number;
    favoriteContentTypes: string[];
    averageSessionTime: number;
  };
  
  // Subscription details (if applicable)
  subscription?: {
    tier: SubscriptionTier;
    billingCycle: 'monthly' | 'yearly' | 'lifetime';
    amount: number;
    currency: string;
    nextBillingDate?: string;
    autoRenew: boolean;
  };
  
  // Privacy and access
  accessLevel: 'public' | 'follower' | 'subscriber' | 'premium';
  blockedContent: string[];
  
  metadata: {
    createdAt: string;
    lastModified: string;
    source: 'direct' | 'recommendation' | 'discovery' | 'invitation';
    referrer?: string;
  };
}

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  
  // Pricing
  price: {
    monthly: number;
    yearly: number;
    lifetime?: number;
  };
  currency: string;
  
  // Features and access
  features: SubscriptionFeature[];
  accessLevel: number;        // 1-10 priority level
  contentAccess: string[];    // Content types accessible
  
  // Limits and quotas
  limits: {
    monthlyInteractions?: number;
    concurrentSessions?: number;
    prioritySupport: boolean;
    customization: boolean;
    dataExport: boolean;
  };
  
  // Availability
  available: boolean;
  maxSubscribers?: number;
  eligibilityRequirements?: string[];
  
  metadata: {
    createdAt: string;
    popularity: number;
    retentionRate: number;
  };
}

class FollowerRelationshipManager {
  private relationshipStore: FollowerRelationshipStore;
  private notificationService: FollowerNotificationService;
  private engagementTracker: EngagementTracker;
  private subscriptionManager: SubscriptionManager;
  private analyticsService: FollowerAnalyticsService;
  
  constructor() {
    this.relationshipStore = new FollowerRelationshipStore();
    this.notificationService = new FollowerNotificationService();
    this.engagementTracker = new EngagementTracker();
    this.subscriptionManager = new SubscriptionManager();
    this.analyticsService = new FollowerAnalyticsService();
  }
  
  async followPersona(
    followerId: string,
    followeeId: string,
    relationshipType: 'follow' | 'subscribe' = 'follow',
    subscriptionTier?: string
  ): Promise<FollowerRelationship> {
    // Validate follow request
    await this.validateFollowRequest(followerId, followeeId, relationshipType);
    
    // Check for existing relationship
    const existingRelationship = await this.relationshipStore.findRelationship(
      followerId,
      followeeId
    );
    
    if (existingRelationship) {
      return await this.upgradeRelationship(existingRelationship, relationshipType, subscriptionTier);
    }
    
    // Get persona information
    const followeePersona = await this.getPersonaInfo(followeeId);
    
    // Create new relationship
    const relationship: FollowerRelationship = {
      id: generateId(),
      followerId,
      followeeId,
      relationshipType,
      status: 'active',
      followedAt: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      notifications: await this.getDefaultNotificationSettings(followerId),
      engagement: {
        totalInteractions: 0,
        lastWeekInteractions: 0,
        favoriteContentTypes: [],
        averageSessionTime: 0
      },
      accessLevel: this.determineAccessLevel(relationshipType, subscriptionTier),
      blockedContent: [],
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        source: 'direct'
      }
    };
    
    // Handle subscription if applicable
    if (relationshipType === 'subscribe' && subscriptionTier) {
      relationship.subscription = await this.subscriptionManager.createSubscription(
        followerId,
        followeeId,
        subscriptionTier
      );
      relationship.expiresAt = relationship.subscription.nextBillingDate;
    }
    
    // Store relationship
    await this.relationshipStore.store(relationship);
    
    // Update persona follower count
    await this.updatePersonaFollowerCount(followeeId, 1);
    
    // Send welcome notification
    await this.notificationService.sendWelcomeNotification(relationship);
    
    // Track analytics
    await this.analyticsService.trackNewFollower(relationship);
    
    // Recommend similar personas
    await this.generatePersonaRecommendations(followerId, followeeId);
    
    return relationship;
  }
  
  async unfollowPersona(
    followerId: string,
    followeeId: string,
    reason?: string
  ): Promise<void> {
    const relationship = await this.relationshipStore.findRelationship(
      followerId,
      followeeId
    );
    
    if (!relationship) {
      throw new Error('Relationship not found');
    }
    
    // Handle subscription cancellation if applicable
    if (relationship.subscription) {
      await this.subscriptionManager.cancelSubscription(
        relationship.subscription,
        reason
      );
    }
    
    // Update relationship status
    relationship.status = 'inactive';
    relationship.metadata.lastModified = new Date().toISOString();
    
    // Store unfollowing reason
    if (reason) {
      relationship.metadata.unfollowReason = reason;
    }
    
    // Archive relationship (don't delete for analytics)
    await this.relationshipStore.archive(relationship);
    
    // Update persona follower count
    await this.updatePersonaFollowerCount(followeeId, -1);
    
    // Send farewell notification if configured
    await this.notificationService.sendFarewellNotification(relationship);
    
    // Track analytics
    await this.analyticsService.trackUnfollow(relationship, reason);
  }
  
  async getFollowerFeed(
    userId: string,
    options: FeedOptions = {}
  ): Promise<FollowerFeed> {
    // Get user's followed personas
    const followedPersonas = await this.relationshipStore.getFollowedPersonas(
      userId,
      { status: 'active' }
    );
    
    // Get recent content from followed personas
    const feedContent = await this.aggregateFollowerContent(
      followedPersonas,
      options
    );
    
    // Personalize content based on engagement history
    const personalizedContent = await this.personalizeContent(
      userId,
      feedContent
    );
    
    // Add engagement metadata
    const enrichedContent = await this.enrichContentWithEngagement(
      personalizedContent,
      userId
    );
    
    return {
      userId,
      content: enrichedContent,
      hasMore: enrichedContent.length === (options.limit || 20),
      lastUpdated: new Date().toISOString(),
      personalizationScore: await this.calculatePersonalizationScore(userId)
    };
  }
  
  private async aggregateFollowerContent(
    followedPersonas: FollowerRelationship[],
    options: FeedOptions
  ): Promise<FeedContent[]> {
    const contentPromises = followedPersonas.map(async (relationship) => {
      // Get content based on access level
      const personaContent = await this.getPersonaContent(
        relationship.followeeId,
        {
          accessLevel: relationship.accessLevel,
          contentTypes: this.getAccessibleContentTypes(relationship),
          limit: options.perPersonaLimit || 5,
          since: options.since || this.getLastFeedCheck(relationship.followerId)
        }
      );
      
      // Filter content based on user preferences
      const filteredContent = await this.filterContentByPreferences(
        personaContent,
        relationship
      );
      
      return filteredContent.map(content => ({
        ...content,
        sourcePersona: relationship.followeeId,
        accessLevel: relationship.accessLevel,
        relationshipType: relationship.relationshipType
      }));
    });
    
    const allContent = (await Promise.all(contentPromises)).flat();
    
    // Sort by relevance and recency
    const sortedContent = allContent.sort((a, b) => {
      const relevanceScore = this.calculateContentRelevance(a, b);
      const recencyScore = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return (relevanceScore * 0.7) + (recencyScore * 0.3);
    });
    
    return sortedContent.slice(0, options.limit || 20);
  }
}
```

### 1.2 Subscription Management System

```typescript
interface Subscription {
  id: string;
  subscriberId: string;
  personaId: string;
  
  // Subscription details
  tier: SubscriptionTier;
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'past_due';
  
  // Billing information
  billing: {
    cycle: 'monthly' | 'yearly' | 'lifetime';
    amount: number;
    currency: string;
    nextBillingDate?: string;
    lastBillingDate?: string;
    paymentMethodId: string;
    autoRenew: boolean;
  };
  
  // Usage tracking
  usage: {
    monthlyInteractions: number;
    lastInteraction: string;
    favoriteFeatures: string[];
    satisfactionScore?: number;
  };
  
  // Subscription lifecycle
  lifecycle: {
    startDate: string;
    trialEndDate?: string;
    renewalDate?: string;
    cancellationDate?: string;
    expirationDate?: string;
  };
  
  // Benefits tracking
  benefits: {
    accessed: string[];         // Features accessed
    unused: string[];           // Available but unused features
    valueRealized: number;      // Estimated value received
  };
  
  metadata: {
    createdAt: string;
    lastModified: string;
    referralSource?: string;
    campaignId?: string;
    retentionRisk: 'low' | 'medium' | 'high';
  };
}

class SubscriptionManager {
  private subscriptionStore: SubscriptionStore;
  private billingProcessor: BillingProcessor;
  private usageTracker: SubscriptionUsageTracker;
  private retentionAnalyzer: RetentionAnalyzer;
  private notificationService: SubscriptionNotificationService;
  
  async createSubscription(
    subscriberId: string,
    personaId: string,
    tierId: string,
    paymentMethodId: string,
    options: SubscriptionCreationOptions = {}
  ): Promise<Subscription> {
    // Get subscription tier details
    const tier = await this.getSubscriptionTier(tierId);
    
    if (!tier || !tier.available) {
      throw new Error('Subscription tier not available');
    }
    
    // Validate subscriber eligibility
    await this.validateSubscriberEligibility(subscriberId, tier);
    
    // Process initial payment (unless trial)
    let billingResult;
    if (!options.startWithTrial) {
      billingResult = await this.billingProcessor.processInitialPayment(
        subscriberId,
        paymentMethodId,
        tier.price[options.billingCycle || 'monthly'],
        tier.currency
      );
    }
    
    // Create subscription
    const subscription: Subscription = {
      id: generateId(),
      subscriberId,
      personaId,
      tier,
      status: options.startWithTrial ? 'trial' : 'active',
      billing: {
        cycle: options.billingCycle || 'monthly',
        amount: tier.price[options.billingCycle || 'monthly'],
        currency: tier.currency,
        nextBillingDate: this.calculateNextBillingDate(
          options.billingCycle || 'monthly',
          options.trialDays
        ),
        paymentMethodId,
        autoRenew: options.autoRenew !== false
      },
      usage: {
        monthlyInteractions: 0,
        lastInteraction: new Date().toISOString(),
        favoriteFeatures: [],
      },
      lifecycle: {
        startDate: new Date().toISOString(),
        trialEndDate: options.trialDays ? 
          this.addDays(new Date(), options.trialDays).toISOString() : undefined
      },
      benefits: {
        accessed: [],
        unused: tier.features.map(f => f.id),
        valueRealized: 0
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        referralSource: options.referralSource,
        campaignId: options.campaignId,
        retentionRisk: 'low'
      }
    };
    
    // Store subscription
    await this.subscriptionStore.store(subscription);
    
    // Grant subscription benefits
    await this.grantSubscriptionBenefits(subscription);
    
    // Send welcome notification
    await this.notificationService.sendSubscriptionWelcome(subscription);
    
    // Schedule billing reminders
    await this.scheduleBillingReminders(subscription);
    
    // Track subscription analytics
    await this.trackSubscriptionEvent('created', subscription);
    
    return subscription;
  }
  
  async processSubscriptionBilling(subscriptionId: string): Promise<BillingResult> {
    const subscription = await this.subscriptionStore.findById(subscriptionId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    
    if (subscription.status !== 'active' && subscription.status !== 'past_due') {
      throw new Error('Subscription not eligible for billing');
    }
    
    const billingResult: BillingResult = {
      subscriptionId,
      attemptedAt: new Date().toISOString(),
      success: false,
      amount: subscription.billing.amount,
      currency: subscription.billing.currency
    };
    
    try {
      // Process payment
      const paymentResult = await this.billingProcessor.processRecurringPayment(
        subscription.billing.paymentMethodId,
        subscription.billing.amount,
        subscription.billing.currency,
        {
          subscriptionId: subscription.id,
          subscriberId: subscription.subscriberId,
          personaId: subscription.personaId
        }
      );
      
      if (paymentResult.success) {
        // Update subscription
        subscription.billing.lastBillingDate = new Date().toISOString();
        subscription.billing.nextBillingDate = this.calculateNextBillingDate(
          subscription.billing.cycle
        );
        subscription.status = 'active';
        subscription.metadata.lastModified = new Date().toISOString();
        
        // Reset monthly usage if new billing cycle
        if (subscription.billing.cycle === 'monthly') {
          subscription.usage.monthlyInteractions = 0;
        }
        
        await this.subscriptionStore.update(subscription);
        
        // Send billing success notification
        await this.notificationService.sendBillingSuccess(subscription, paymentResult);
        
        billingResult.success = true;
        billingResult.transactionId = paymentResult.transactionId;
        
      } else {
        // Handle billing failure
        await this.handleBillingFailure(subscription, paymentResult);
        billingResult.error = paymentResult.error;
      }
      
    } catch (error) {
      billingResult.error = error.message;
      await this.handleBillingFailure(subscription, { error: error.message });
    }
    
    // Track billing event
    await this.trackSubscriptionEvent('billing_attempted', subscription, billingResult);
    
    return billingResult;
  }
  
  async cancelSubscription(
    subscriptionId: string,
    reason: string,
    cancelImmediately: boolean = false
  ): Promise<void> {
    const subscription = await this.subscriptionStore.findById(subscriptionId);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    
    // Determine cancellation effective date
    const effectiveDate = cancelImmediately ? 
      new Date().toISOString() : 
      subscription.billing.nextBillingDate || new Date().toISOString();
    
    // Update subscription
    subscription.status = cancelImmediately ? 'cancelled' : 'cancelled_pending';
    subscription.lifecycle.cancellationDate = new Date().toISOString();
    subscription.lifecycle.expirationDate = effectiveDate;
    subscription.billing.autoRenew = false;
    subscription.metadata.lastModified = new Date().toISOString();
    subscription.metadata.cancellationReason = reason;
    
    await this.subscriptionStore.update(subscription);
    
    // Revoke benefits if immediate cancellation
    if (cancelImmediately) {
      await this.revokeSubscriptionBenefits(subscription);
    } else {
      // Schedule benefit revocation for expiration date
      await this.scheduleBenefitRevocation(subscription, effectiveDate);
    }
    
    // Process refund if applicable
    await this.processRefundIfApplicable(subscription, reason);
    
    // Send cancellation confirmation
    await this.notificationService.sendCancellationConfirmation(
      subscription,
      reason,
      effectiveDate
    );
    
    // Track cancellation analytics
    await this.trackSubscriptionEvent('cancelled', subscription, { reason });
    
    // Trigger retention campaign if appropriate
    await this.triggerRetentionCampaign(subscription, reason);
  }
  
  private async handleBillingFailure(
    subscription: Subscription,
    paymentResult: PaymentResult
  ): Promise<void> {
    // Update subscription status
    subscription.status = 'past_due';
    subscription.metadata.lastModified = new Date().toISOString();
    
    // Track failure count
    const failureCount = await this.getBillingFailureCount(subscription.id);
    
    if (failureCount >= 3) {
      // Suspend subscription after 3 failures
      subscription.status = 'cancelled';
      subscription.lifecycle.cancellationDate = new Date().toISOString();
      subscription.lifecycle.expirationDate = new Date().toISOString();
      
      // Revoke benefits
      await this.revokeSubscriptionBenefits(subscription);
      
      // Send final notice
      await this.notificationService.sendSubscriptionSuspended(subscription);
    } else {
      // Schedule retry
      await this.scheduleBillingRetry(subscription, failureCount + 1);
      
      // Send payment failure notification
      await this.notificationService.sendPaymentFailure(subscription, paymentResult);
    }
    
    await this.subscriptionStore.update(subscription);
  }
}
```

### 1.3 Social Feed and Content Discovery

```typescript
interface SocialFeed {
  id: string;
  userId: string;
  
  // Feed configuration
  feedType: 'following' | 'discover' | 'trending' | 'personalized';
  contentTypes: ContentType[];
  maxAge: number; // hours
  
  // Content items
  items: FeedItem[];
  
  // Pagination
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    totalItems: number;
  };
  
  // Personalization
  personalization: {
    interests: string[];
    preferredPersonas: string[];
    engagementPatterns: EngagementPattern[];
    recommendationScore: number;
  };
  
  // Metadata
  metadata: {
    generatedAt: string;
    lastRefresh: string;
    refreshCount: number;
    algorithm: string;
  };
}

interface FeedItem {
  id: string;
  type: 'post' | 'achievement' | 'milestone' | 'interaction' | 'recommendation';
  
  // Content details
  content: {
    title?: string;
    body?: string;
    media?: MediaItem[];
    links?: LinkPreview[];
  };
  
  // Source information
  source: {
    personaId: string;
    personaName: string;
    personaAvatar?: string;
    verified: boolean;
  };
  
  // Interaction data
  interactions: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    userHasLiked: boolean;
    userHasCommented: boolean;
    userHasSaved: boolean;
  };
  
  // Timing and visibility
  publishedAt: string;
  visibility: 'public' | 'followers' | 'subscribers' | 'premium';
  
  // Engagement and relevance
  relevanceScore: number;
  engagementRate: number;
  trendingScore?: number;
  
  // Access control
  requiresSubscription: boolean;
  subscriptionTier?: string;
  accessLevel: 'free' | 'follower' | 'subscriber' | 'premium';
}

class SocialFeedManager {
  private feedGenerator: FeedGenerator;
  private contentRanker: ContentRanker;
  private personalizationEngine: PersonalizationEngine;
  private trendingAnalyzer: TrendingAnalyzer;
  private interactionTracker: InteractionTracker;
  
  async generatePersonalizedFeed(
    userId: string,
    options: FeedGenerationOptions = {}
  ): Promise<SocialFeed> {
    // Get user's social graph
    const socialGraph = await this.getSocialGraph(userId);
    
    // Get user's interests and preferences
    const userProfile = await this.getUserProfile(userId);
    
    // Generate base content from followed personas
    const followingContent = await this.getFollowingContent(
      socialGraph.following,
      options
    );
    
    // Add discovery content based on interests
    const discoveryContent = await this.getDiscoveryContent(
      userProfile.interests,
      socialGraph,
      options
    );
    
    // Add trending content
    const trendingContent = await this.getTrendingContent(
      userProfile.interests,
      options
    );
    
    // Combine and rank all content
    const allContent = [...followingContent, ...discoveryContent, ...trendingContent];
    const rankedContent = await this.contentRanker.rankContent(
      allContent,
      userProfile,
      socialGraph
    );
    
    // Apply personalization
    const personalizedContent = await this.personalizationEngine.personalizeContent(
      rankedContent,
      userProfile,
      options
    );
    
    // Create feed
    const feed: SocialFeed = {
      id: generateId(),
      userId,
      feedType: 'personalized',
      contentTypes: options.contentTypes || ['post', 'achievement', 'interaction'],
      maxAge: options.maxAge || 168, // 7 days
      items: personalizedContent.slice(0, options.limit || 20),
      pagination: {
        hasMore: personalizedContent.length > (options.limit || 20),
        nextCursor: this.generateNextCursor(personalizedContent, options.limit || 20),
        totalItems: personalizedContent.length
      },
      personalization: {
        interests: userProfile.interests,
        preferredPersonas: socialGraph.following.slice(0, 10).map(f => f.personaId),
        engagementPatterns: userProfile.engagementPatterns,
        recommendationScore: await this.calculateRecommendationScore(userId)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        lastRefresh: new Date().toISOString(),
        refreshCount: 1,
        algorithm: 'personalized_v2'
      }
    };
    
    // Track feed generation
    await this.trackFeedGeneration(feed);
    
    return feed;
  }
  
  async recordInteraction(
    userId: string,
    feedItemId: string,
    interactionType: InteractionType,
    context?: InteractionContext
  ): Promise<void> {
    // Validate interaction
    await this.validateInteraction(userId, feedItemId, interactionType);
    
    // Record interaction
    const interaction: SocialInteraction = {
      id: generateId(),
      userId,
      feedItemId,
      interactionType,
      timestamp: new Date().toISOString(),
      context: context || {},
      deviceInfo: await this.getDeviceInfo(userId),
      sessionId: await this.getSessionId(userId)
    };
    
    await this.interactionTracker.recordInteraction(interaction);
    
    // Update engagement metrics
    await this.updateEngagementMetrics(feedItemId, interactionType);
    
    // Update user profile with interaction data
    await this.updateUserProfile(userId, interaction);
    
    // Trigger real-time notifications if applicable
    await this.triggerInteractionNotifications(interaction);
    
    // Update personalization signals
    await this.personalizationEngine.updatePersonalizationSignals(
      userId,
      interaction
    );
  }
  
  private async getFollowingContent(
    following: FollowerRelationship[],
    options: FeedGenerationOptions
  ): Promise<FeedItem[]> {
    const contentPromises = following.map(async (relationship) => {
      const content = await this.getPersonaRecentContent(
        relationship.followeeId,
        {
          accessLevel: relationship.accessLevel,
          limit: 3,
          since: this.getLastContentFetch(relationship.followerId, relationship.followeeId)
        }
      );
      
      return content.map(item => this.transformToFeedItem(item, relationship));
    });
    
    const allContent = (await Promise.all(contentPromises)).flat();
    
    // Sort by recency and engagement
    return allContent.sort((a, b) => {
      const recencyScore = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      const engagementScore = (b.interactions.likes + b.interactions.comments) - 
                             (a.interactions.likes + a.interactions.comments);
      return (recencyScore * 0.6) + (engagementScore * 0.4);
    });
  }
  
  private async getDiscoveryContent(
    interests: string[],
    socialGraph: SocialGraph,
    options: FeedGenerationOptions
  ): Promise<FeedItem[]> {
    // Find personas matching user interests
    const matchingPersonas = await this.findPersonasByInterests(
      interests,
      { exclude: socialGraph.following.map(f => f.followeeId) }
    );
    
    // Get content from matching personas
    const discoveryContent = await Promise.all(
      matchingPersonas.slice(0, 10).map(async (persona) => {
        const content = await this.getPersonaRecentContent(
          persona.id,
          { limit: 2, public: true }
        );
        
        return content.map(item => ({
          ...this.transformToFeedItem(item),
          type: 'recommendation' as const,
          recommendationReason: `Based on your interest in ${persona.matchingInterests.join(', ')}`
        }));
      })
    );
    
    return discoveryContent.flat();
  }
  
  private async getTrendingContent(
    userInterests: string[],
    options: FeedGenerationOptions
  ): Promise<FeedItem[]> {
    // Get trending content across the platform
    const trendingItems = await this.trendingAnalyzer.getTrendingContent({
      timeWindow: '24h',
      categories: userInterests,
      limit: 5
    });
    
    return trendingItems.map(item => ({
      ...this.transformToFeedItem(item),
      trendingScore: item.trendingScore,
      type: 'trending' as const
    }));
  }
}
```

### 1.4 Engagement Analytics and Insights

```typescript
interface EngagementMetrics {
  personaId: string;
  period: {
    start: string;
    end: string;
    type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  // Follower metrics
  followers: {
    total: number;
    new: number;
    lost: number;
    growth: number;        // Percentage
    churnRate: number;     // Percentage
  };
  
  // Subscriber metrics
  subscribers: {
    total: number;
    new: number;
    cancelled: number;
    revenue: number;
    arpu: number;          // Average Revenue Per User
    ltv: number;           // Lifetime Value
  };
  
  // Content engagement
  content: {
    posts: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    averageEngagementRate: number;
    topPerformingContent: ContentMetric[];
  };
  
  // Interaction patterns
  interactions: {
    totalInteractions: number;
    averageSessionTime: number;
    peakInteractionHours: number[];
    mostActiveFollowers: string[];
    interactionTypes: Record<string, number>;
  };
  
  // Subscription insights
  subscriptionInsights: {
    conversionRate: number;      // Follow to subscribe
    retentionRates: {
      month1: number;
      month3: number;
      month6: number;
      month12: number;
    };
    popularTiers: SubscriptionTierMetric[];
    churnReasons: Record<string, number>;
  };
}

class EngagementAnalyticsService {
  private metricsStore: EngagementMetricsStore;
  private dataAggregator: EngagementDataAggregator;
  private insightGenerator: EngagementInsightGenerator;
  private reportGenerator: AnalyticsReportGenerator;
  
  async generateEngagementReport(
    personaId: string,
    period: TimePeriod
  ): Promise<EngagementReport> {
    // Aggregate raw data
    const rawData = await this.dataAggregator.aggregateEngagementData(
      personaId,
      period
    );
    
    // Calculate metrics
    const metrics = await this.calculateEngagementMetrics(rawData, period);
    
    // Generate insights
    const insights = await this.insightGenerator.generateInsights(metrics, rawData);
    
    // Create recommendations
    const recommendations = await this.generateRecommendations(metrics, insights);
    
    // Generate visualizations
    const visualizations = await this.createVisualizations(metrics, period);
    
    return {
      personaId,
      period,
      metrics,
      insights,
      recommendations,
      visualizations,
      generatedAt: new Date().toISOString()
    };
  }
  
  async trackFollowerJourney(
    followerId: string,
    personaId: string
  ): Promise<FollowerJourney> {
    // Get all interactions between follower and persona
    const interactions = await this.getFollowerInteractions(followerId, personaId);
    
    // Identify journey stages
    const journeyStages = await this.identifyJourneyStages(interactions);
    
    // Calculate engagement evolution
    const engagementEvolution = await this.calculateEngagementEvolution(interactions);
    
    // Predict future behavior
    const behaviorPrediction = await this.predictFollowerBehavior(
      followerId,
      personaId,
      interactions
    );
    
    return {
      followerId,
      personaId,
      stages: journeyStages,
      engagementEvolution,
      currentStage: journeyStages[journeyStages.length - 1],
      prediction: behaviorPrediction,
      totalInteractions: interactions.length,
      relationshipDuration: this.calculateRelationshipDuration(interactions),
      lastActivity: interactions[0]?.timestamp
    };
  }
  
  private async calculateEngagementMetrics(
    rawData: EngagementRawData,
    period: TimePeriod
  ): Promise<EngagementMetrics> {
    // Calculate follower metrics
    const followerMetrics = {
      total: rawData.followers.current,
      new: rawData.followers.gained,
      lost: rawData.followers.lost,
      growth: this.calculateGrowthRate(
        rawData.followers.current,
        rawData.followers.previous
      ),
      churnRate: this.calculateChurnRate(
        rawData.followers.lost,
        rawData.followers.previous
      )
    };
    
    // Calculate subscriber metrics
    const subscriberMetrics = {
      total: rawData.subscribers.current,
      new: rawData.subscribers.new,
      cancelled: rawData.subscribers.cancelled,
      revenue: rawData.revenue.total,
      arpu: rawData.revenue.total / Math.max(rawData.subscribers.current, 1),
      ltv: await this.calculateLifetimeValue(rawData.subscribers.cohort)
    };
    
    // Calculate content metrics
    const contentMetrics = {
      posts: rawData.content.posts.length,
      totalViews: rawData.content.posts.reduce((sum, post) => sum + post.views, 0),
      totalLikes: rawData.content.posts.reduce((sum, post) => sum + post.likes, 0),
      totalComments: rawData.content.posts.reduce((sum, post) => sum + post.comments, 0),
      totalShares: rawData.content.posts.reduce((sum, post) => sum + post.shares, 0),
      averageEngagementRate: this.calculateAverageEngagementRate(rawData.content.posts),
      topPerformingContent: this.getTopPerformingContent(rawData.content.posts, 5)
    };
    
    // Calculate interaction metrics
    const interactionMetrics = {
      totalInteractions: rawData.interactions.length,
      averageSessionTime: this.calculateAverageSessionTime(rawData.interactions),
      peakInteractionHours: this.identifyPeakHours(rawData.interactions),
      mostActiveFollowers: this.getMostActiveFollowers(rawData.interactions, 10),
      interactionTypes: this.countInteractionTypes(rawData.interactions)
    };
    
    // Calculate subscription insights
    const subscriptionInsights = {
      conversionRate: this.calculateConversionRate(
        rawData.followers.total,
        rawData.subscribers.total
      ),
      retentionRates: await this.calculateRetentionRates(rawData.subscribers.cohort),
      popularTiers: this.analyzePopularTiers(rawData.subscriptions),
      churnReasons: this.analyzeChurnReasons(rawData.subscriptions.cancelled)
    };
    
    return {
      personaId: rawData.personaId,
      period,
      followers: followerMetrics,
      subscribers: subscriberMetrics,
      content: contentMetrics,
      interactions: interactionMetrics,
      subscriptionInsights
    };
  }
}
```

## UI/UX Implementation

### Social Dashboard Interface

```typescript
const FollowerDashboard: React.FC<FollowerDashboardProps> = ({
  personaId,
  metrics,
  onMetricsRefresh
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  
  return (
    <div className="follower-dashboard">
      <div className="dashboard-header">
        <h2>Follower & Subscription Analytics</h2>
        <div className="dashboard-controls">
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            options={['1d', '7d', '30d', '90d', '1y']}
          />
          <button onClick={onMetricsRefresh} className="btn-refresh">
            Refresh Data
          </button>
        </div>
      </div>
      
      <div className="metrics-overview">
        <MetricCard
          title="Total Followers"
          value={metrics.followers.total}
          change={metrics.followers.growth}
          trend="up"
          icon="users"
        />
        <MetricCard
          title="Active Subscribers"
          value={metrics.subscribers.total}
          change={metrics.subscribers.new - metrics.subscribers.cancelled}
          trend="up"
          icon="star"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${metrics.subscribers.revenue}`}
          change={metrics.subscribers.arpu}
          trend="up"
          icon="dollar"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${(metrics.content.averageEngagementRate * 100).toFixed(1)}%`}
          change={0.5}
          trend="up"
          icon="heart"
        />
      </div>
      
      <div className="dashboard-tabs">
        <TabBar
          tabs={[
            { id: 'overview', label: 'Overview', icon: 'chart' },
            { id: 'followers', label: 'Followers', icon: 'users' },
            { id: 'subscribers', label: 'Subscribers', icon: 'star' },
            { id: 'content', label: 'Content', icon: 'document' },
            { id: 'insights', label: 'Insights', icon: 'lightbulb' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewTab metrics={metrics} timeRange={timeRange} />
        )}
        {activeTab === 'followers' && (
          <FollowersTab 
            followers={metrics.followers}
            interactions={metrics.interactions}
            timeRange={timeRange}
          />
        )}
        {activeTab === 'subscribers' && (
          <SubscribersTab 
            subscribers={metrics.subscribers}
            insights={metrics.subscriptionInsights}
            timeRange={timeRange}
          />
        )}
        {activeTab === 'content' && (
          <ContentTab 
            content={metrics.content}
            timeRange={timeRange}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsTab 
            personaId={personaId}
            metrics={metrics}
            timeRange={timeRange}
          />
        )}
      </div>
    </div>
  );
};
```

## Performance Requirements

### Social System Performance Targets

| Operation | Target Time | Measurement |
|-----------|-------------|-------------|
| Follow/Unfollow Action | <200ms | User relationship creation |
| Feed Generation | <500ms | Personalized feed with 20 items |
| Subscription Processing | <2s | Payment processing and activation |
| Analytics Dashboard | <1s | Metrics calculation and display |

### Scalability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent Users | 10,000+ | Active social feed users |
| Relationships per User | 1,000+ | Following/subscription relationships |
| Feed Updates/Second | 1,000+ | Real-time feed item processing |
| Analytics Processing | <5min | Daily metrics aggregation |

## Implementation Timeline

### Phase 1: Core Social System (Weeks 1-2)

- Follower relationship management
- Basic subscription system
- Simple social feed
- Database schema and APIs

### Phase 2: Advanced Features (Weeks 3-4)

- Personalized feed algorithms
- Engagement tracking system
- Subscription tier management
- Notification system

### Phase 3: Analytics & Insights (Weeks 5-6)

- Engagement analytics dashboard
- Follower journey tracking
- Revenue analytics
- Retention analysis

### Phase 4: Polish & Integration (Weeks 7-8)

- UI/UX implementation
- Performance optimization
- Integration testing
- Social features refinement

## Testing & Validation

### Social System Testing

- **Relationship Tests**: Follow/unfollow functionality and data integrity
- **Feed Tests**: Personalization accuracy and performance
- **Billing Tests**: Subscription lifecycle and payment processing
- **Analytics Tests**: Metrics accuracy and dashboard performance

### Success Metrics

- Follow conversion rate >15%
- Subscription retention rate >80% (monthly)
- Feed engagement rate >25%
- Analytics accuracy >95%

This comprehensive follower and subscription system creates engaging social connections while providing robust monetization opportunities and deep analytics insights for persona creators.
