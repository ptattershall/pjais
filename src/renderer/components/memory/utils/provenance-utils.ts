import { ProvenanceNode, LineageAnalysis, KeyAncestor, DerivationChain, RelationshipData, ProvenanceNodeMetadata } from '@shared/types/provenance';

// Calculate influence score for a node
export const calculateInfluenceScore = (node: ProvenanceNode): number => {
  const childrenInfluence = node.children.length * 0.3;
  const relationshipStrength = node.relationships.reduce((sum, rel) => sum + (rel.strength || 0), 0) * 0.4;
  const accessWeight = Math.log(node.metadata.accessCount + 1) * 0.2;
  const recencyWeight = node.metadata.lastModified 
    ? (Date.now() - node.metadata.lastModified.getTime()) / (1000 * 60 * 60 * 24) * 0.1
    : 0;

  return childrenInfluence + relationshipStrength + accessWeight - recencyWeight;
};

// Find derivation chains in the tree
export const findDerivationChains = (tree: ProvenanceNode): DerivationChain[] => {
  const chains: DerivationChain[] = [];

  const findChains = (node: ProvenanceNode, currentChain: ProvenanceNode[]) => {
    const newChain = [...currentChain, node];
    
    if (node.children.length === 0 && newChain.length > 1) {
      // End of chain
      const avgStrength = newChain.slice(1).reduce((sum, n, i) => {
        const rel = newChain[i].relationships.find(r => r.fromMemoryId === n.id);
        return sum + (rel?.strength || 0);
      }, 0) / (newChain.length - 1);

      const avgConfidence = newChain.slice(1).reduce((sum, n, i) => {
        const rel = newChain[i].relationships.find(r => r.fromMemoryId === n.id);
        return sum + (rel?.confidence || 0);
      }, 0) / (newChain.length - 1);

      chains.push({
        chain: newChain,
        strength: avgStrength,
        confidence: avgConfidence,
        chainType: 'linear',
        totalInfluence: avgStrength * newChain.length
      });
    } else {
      node.children.forEach(child => findChains(child, newChain));
    }
  };

  findChains(tree, []);
  return chains;
};

// Analyze lineage patterns
export const analyzeLineage = (tree: ProvenanceNode): LineageAnalysis => {
  const allNodes: ProvenanceNode[] = [];
  const traverse = (node: ProvenanceNode) => {
    allNodes.push(node);
    node.children.forEach(traverse);
  };
  traverse(tree);

  const totalNodes = allNodes.length;
  const maxDepth = Math.max(...allNodes.map(n => n.level));
  const branchingFactor = totalNodes > 1 ? (totalNodes - 1) / totalNodes : 0;

  // Calculate influence strength
  const totalRelationships = allNodes.reduce((sum, node) => sum + node.relationships.length, 0);
  const avgRelationshipStrength = totalRelationships > 0
    ? allNodes.reduce((sum, node) => 
        sum + node.relationships.reduce((rSum, rel) => rSum + (rel.strength || 0), 0), 0
      ) / totalRelationships
    : 0;

  // Find key ancestors (high influence score)
  const keyAncestors: KeyAncestor[] = allNodes
    .filter(node => node.level < maxDepth)
    .map(node => ({
      node,
      influenceScore: calculateInfluenceScore(node),
      pathLength: maxDepth - node.level,
      influenceType: 'direct' as const,
      confidence: 0.8 // Default confidence
    }))
    .sort((a, b) => b.influenceScore - a.influenceScore)
    .slice(0, 5);

  // Find strong derivation chains
  const derivationChains: DerivationChain[] = findDerivationChains(tree)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);

  return {
    totalNodes,
    maxDepth,
    branchingFactor,
    influenceStrength: avgRelationshipStrength,
    keyAncestors,
    derivationChains,
    analysisTimestamp: new Date().toISOString()
  };
};

// Build provenance tree from memory relationships
export const buildProvenanceTree = async (
  memoryId: string, 
  maxDepth: number, 
  depth = 0
): Promise<ProvenanceNode | null> => {
  if (depth >= maxDepth) return null;

  try {
    // Get the root memory using correct API method
    const memory = await window.electronAPI?.memory?.retrieve(memoryId);
    if (!memory) return null;

    // For now, simulate related memories since getRelatedMemories API doesn't exist yet
    // In a real implementation, this would call the relationship graph API
    const relatedMemories: RelationshipData[] = [];

    // Build child nodes recursively
    const children: ProvenanceNode[] = [];
    const relationships: import('@shared/types/memory').MemoryRelationship[] = [];

    for (const related of relatedMemories) {
      const childNode = await buildProvenanceTree(related.memory.id!, maxDepth, depth + 1);
      if (childNode) {
        children.push(childNode);
        relationships.push(related.relationship);
      }
    }

    // Calculate metadata
    const metadata: ProvenanceNodeMetadata = {
      createdAt: new Date(memory.createdAt || Date.now()),
      lastModified: memory.lastAccessed ? new Date(memory.lastAccessed) : undefined,
      accessCount: 0, // Memory entity doesn't have accessCount, so default to 0
      derivedFrom: relatedMemories
        .filter((r: RelationshipData) => ['derived_from', 'caused_by'].includes(r.relationship.type))
        .map((r: RelationshipData) => r.memory.id!),
      influences: relatedMemories
        .filter((r: RelationshipData) => ['influenced_by', 'references'].includes(r.relationship.type))
        .map((r: RelationshipData) => r.memory.id!)
    };

    return {
      id: memory.id!,
      memory,
      level: depth,
      children,
      relationships,
      metadata
    };
  } catch (error) {
    console.error('Error building provenance tree:', error);
    return null;
  }
}; 