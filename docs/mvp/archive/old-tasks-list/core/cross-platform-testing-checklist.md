# Cross-Platform Compatibility Checklist

This document provides a checklist for manually testing the PajamasWeb AI Hub application across different operating systems (Windows, macOS, and Linux) to ensure a consistent and stable user experience.

**Status**: Ready for comprehensive manual testing (automated framework operational with 13 unit + 6 E2E tests passing).

## General Tests

| Feature                  | Windows | macOS | Linux | Notes                               |
| ------------------------ | ------- | ----- | ----- | ----------------------------------- |
| **Application Startup**  | ☐       | ☐     | ☐     | App opens without errors.           |
| **Window Behavior**      | ☐       | ☐     | ☐     | Resize, minimize, maximize, close.  |
| **Quit Application**     | ☐       | ☐     | ☐     | App closes gracefully.              |
| **Asset Loading**        | ☐       | ☐     | ☐     | Icons and images display correctly. |
| **Directory Creation**   | ☐       | ☐     | ☐     | `plugins`, `memory`, etc. created.  |
| **File Structure**       | ☐       | ☐     | ☐     | Reorganized entry points work correctly (`main/index.ts`, `preload/index.ts`, `renderer/index.ts`). |
| **Error Handling**       | ☐       | ☐     | ☐     | Platform-specific errors are caught.|

## Menu & Shortcuts

| Feature                  | Windows | macOS | Linux | Notes                               |
| ------------------------ | ------- | ----- | ----- | ----------------------------------- |
| **App Menu (macOS)**     | N/A     | ☐     | N/A   | `About`, `Hide`, `Quit` work.       |
| **File Menu**            | ☐       | ☐     | ☐     | `New Persona`, `Settings`, `Quit`.  |
| **Edit Menu**            | ☐       | ☐     | ☐     | `Copy`, `Paste`, `Undo` work.       |
| **View Menu**            | ☐       | ☐     | ☐     | `Reload`, `DevTools`, `Zoom` work.  |
| **Window Menu (macOS)**  | N/A     | ☐     | N/A   | `Minimize`, `Zoom`, `Front` work.   |
| **Tools Menu**           | ☐       | ☐     | ☐     | `Plugins`, `Memory` open correctly. |
| **Help Menu**            | ☐       | ☐     | ☐     | `Docs`, `Report Issue` open links.  |
| **Keyboard Shortcuts**   | ☐       | ☐     | ☐     | `Ctrl/Cmd+N`, `+C`, `+V` work.      |

## System Integration

| Feature                     | Windows | macOS | Linux | Notes                                 |
| --------------------------- | ------- | ----- | ----- | ------------------------------------- |
| **`openExternal`**          | ☐       | ☐     | ☐    | Links open in the default browser.   |
| **`showItemInFolder`**      | ☐       | ☐     | ☐    | Opens the correct file/folder.       |
| **Notifications**           | ☐       | ☐     | ☐    | *If implemented*, display correctly. |
| **Dock/Taskbar Icon**       | ☐       | ☐     | ☐    | The correct application icon is used.|
| **App User Model ID (Win)** | ☐       | N/A   | N/A   | Used for notifications and taskbar.  |

## File System

| Feature                     | Windows | macOS | Linux | Notes                               |
| --------------------------- | ------- | ----- | ----- | ----------------------------------- |
| **Path Separators**         | ☐       | ☐     | ☐    | `path.join` used correctly.         |
| **File/Folder Permissions** | ☐       | ☐     | ☐    | App has rights to `userData` dir.   |
| **Plugin Installation**     | ☐       | ☐     | ☐    | Install from a local `.zip` file.   |
| **Persona Save/Load**       | ☐       | ☐     | ☐    | Personas persist across restarts.   |
| **Path Traversal**          | ☐       | ☐     | ☐    | App rejects `../` in paths.         |
| **File Extension Block**    | ☐       | ☐     | ☐    | App rejects disallowed file types.  |
| **File Size Limit**         | ☐       | ☐     | ☐    | App rejects oversized files.        |
| **Missing Manifest**         | ☐       | ☐     | ☐    | Plugin install fails gracefully.    |
| **Duplicate Plugin ID**      | ☐       | ☐     | ☐    | App prevents overwriting plugins.   |

### Production Build Testing

| Feature                  | Windows | macOS | Linux | Notes                               |
| ------------------------ | ------- | ----- | ----- | ----------------------------------- |
| **Installation**         | ☐       | ☐     | ☐     | Installer works, app launches.      |
| **Auto-Update**          | ☐       | ☐     | ☐     | App detects and installs update.    |
| **Crash Reporting**      | ☐       | ☐     | ☐     | Crash report is sent to server.     |
| **Code Signing**         | ☐       | ☐     | N/A   | App is signed (no warnings).        |
| **Overall Stability**    | ☐       | ☐     | ☐     | No crashes during normal use.       |
| **Performance**          | ☐       | ☐     | ☐     | Startup and memory usage are OK.    |
