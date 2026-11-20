# Hope Foundation Volunteer Portal — User Guide

## What the portal is for

The Volunteer Portal is the volunteer-facing interface for Hope Foundation. It lets Members and Volunteers manage their volunteer profile, discover projects and events, submit and track applications, review assignments and recorded hours, and connect with the volunteer community.

The portal shares authentication, operational volunteering data, and community activity with the Hope Foundation backend and NGO Management System. A few appearance and privacy preferences remain browser-local; see [Data storage and sync](#data-storage-and-sync).

## Getting started

### Start the portal

From the portal project folder, install dependencies once and start Vite:

```powershell
cd "C:\Users\pvhat\OneDrive\Desktop\volunteer-portal"
npm install
npm run dev
```

Open **http://localhost:5175**. The Vite configuration proxies `/api` requests to `http://127.0.0.1:8000` by default.

### Start the backend

The portal requires the Hope Foundation API for sign-in and live volunteer data. The main backend must include the `/api/portal/*` and `/api/community/*` routes. In a separate PowerShell terminal:

```powershell
cd "C:\Users\pvhat\OneDrive\Desktop\NGO_Management_System_RBAC_final\ngo\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Only one process can listen on port 8000 at a time. If the command reports that the port is already in use, the API may already be running. The community schema is migration `0007_community`; the configured backend database is currently at `0009_legacy_community_posts`. See the migration caveat in the project [README.md](./README.md) before upgrading a different database.

### Sign in or register

- **Sign in:** Use an existing Hope Foundation account.
- **Create an account:** Enter your name, phone, email, location, and password, confirm the password, and accept the Terms and Privacy Policy. New registrations begin as `Member`; the volunteer team must approve them before they become active Volunteers.
- **Forgot password:** The portal does not reset passwords itself. Contact a volunteer coordinator or administrator.
- **Supported roles:** `Member` and `Volunteer` accounts open the volunteer workspace. An `Admin` account opens a moderation-only workspace. Other administrative roles should use the main NGO Management System.

#### Sign-in screen

![Volunteer Portal sign-in screen](./portal-login-screenshot.png)

This screenshot shows the sign-in page. The authenticated portal screens require a volunteer account, so they are not pictured here.

## App layout and navigation

### Sidebar

The left sidebar links to:

1. Dashboard
2. My Profile
3. Projects
4. Events
5. My Applications
6. My Assignments
7. My Contributions
8. Posts
9. Networking
10. Settings
11. Logout

The bottom of the sidebar also shows the volunteer’s recorded impact hours. On narrow screens, the sidebar opens from the menu button and can be dismissed.

### Top bar

- **Breadcrumb/title:** Shows the current section.
- **Search opportunities:** Enter a query and press Enter to open Projects with that query applied.
- **Notifications bell:** Shows an unread indicator and a short list of recent notification titles and times. Open an item or choose **View all** to read the full message.
- **Profile shortcut:** Opens My Profile and shows the volunteer’s name and status.

## Screens and functions

### Dashboard

The dashboard is a summary of the volunteer’s current activity:

- **Welcome card:** Shows the current date and a shortcut to browse opportunities.
- **Up Next:** Shows the next non-completed assignment, including its date, time/location when available, and a link to the assignment details. If there are no assignments, it explains how to get started.
- **Summary cards:** Upcoming assignments, active applications, current assignments, volunteer hours, and related counts.
- **Open opportunities:** Previews available projects and events. **View all** opens Projects.
- **My applications:** Shows recent applications and opens their tracking details.
- **Your impact:** Summarizes total hours and distinct projects/events, with a shortcut to My Contributions.
- **Your community:** Links to Networking.

Dashboard figures come from the backend and reflect the signed-in volunteer’s records.

### My Profile

My Profile combines personal details, volunteering history, and community activity:

- **Profile header:** Shows the volunteer’s name, status, location, and join date when available.
- **Edit profile:** Enables editing of supported profile fields. Save profile sends supported personal fields to the API.
- **Profile photo:** Choose an image up to 2 MB. The avatar image is currently stored locally in the browser rather than uploaded to the backend.
- **About me and personal details:** Displays the volunteer’s description and contact details.
- **My Posts:** Shows posts authored by the signed-in volunteer profile. Select a post to open the post viewer; **Open community** goes to Posts.
- **My Connections:** Lists accepted connections from Networking. **Find volunteers** opens Networking. Connections are stored by the backend.
- **Skills:** Add skills and remove them while editing.
- **Availability:** Select weekdays to mark them unavailable or available.
- **Volunteer history:** Previews recorded opportunities, roles, dates, and hours; **View all** opens My Contributions.

### Projects and Events

Projects and Events use the same opportunity browser, filtered to the selected type.

- Search by title, category/type, location, or summary.
- Filter by category and location.
- Toggle the displayed result order with the date-order control.
- Opportunity cards show the type, description/summary, date, location, skills, and capacity information when provided.
- Open a card to view the full opportunity details.

### Opportunity details and applying

An opportunity detail screen can show its description, date/time, location, organiser, team capacity, and remaining spots.

- If no application exists, enter optional motivation and choose **Apply**.
- The application is submitted to the Hope Foundation API.
- If an application already exists, the page shows its status and offers **Track application** instead.
- Tracking opens the corresponding application detail.

### My Applications

Use the status tabs to filter between **All**, **Pending**, **Under review**, **Approved**, and **Rejected**. Each row shows the opportunity, application date, status, and last update. Choose **View** to open its progress timeline.

### Application details

The detail view shows the submission date, current status, timeline, and what happens next. A **Pending** application can be withdrawn. Other statuses do not show the withdraw action. Application decisions and status changes are managed by the Hope Foundation team.

### My Assignments

Assignments are grouped under **Current**, **Upcoming**, and **Completed**, with a count for each tab. Each assignment card shows its date, role, status, time, and location when those details are available.

Open an assignment for its schedule, responsibilities, and contact information. **View instructions** expands day-of instructions when supplied. If a coordinator email is available, **Send message** opens the device’s email application.

### My Contributions

The contribution screen summarizes hours recorded by the organization:

- Total volunteer hours, projects, events, and contribution days.
- Monthly hours chart.
- Pie chart and legend breaking recorded hours down by activity type.
- Top activity highlight.
- Contribution history table with date, opportunity, role, hours, and attendance status.

These figures depend on attendance and contribution records entered by staff. If hours have not been recorded, the charts and history show an empty state.

### Posts (Community)

Posts is the volunteer community feed.

- **Create post:** Write text and optionally attach one image. Images must be under 2 MB. Text is required to publish.
- **Publish / Cancel:** Publish adds the post to the feed; Cancel discards the draft.
- **Like:** Toggle your like on a post.
- **Comment:** Expand comments and add a comment.
- **Share:** Copy the current page URL to the clipboard.
- **Community guidelines:** Expand the brief guidelines from the side panel.

Posts show their date and time. Posts, optional image data, comments and likes are stored in the Hope Foundation database and appear to other signed-in users on any device. Community content is shared through the main NGO Management backend.

Use **Report** on another volunteer’s post to enter a reason and submit it to the administrator moderation queue. The author cannot report their own post, and the same user cannot create duplicate open reports for one post.

### Networking

Networking shows profile cards loaded from active volunteer profiles in the backend. The directory uses only the profile ID, name, city, skills, visible post count, and mutual-connection count; it does not return email or phone. Search by name or interest and filter by location or skill.

- **View profile:** Opens a volunteer’s profile, including their interests and posts from that profile.
- **Connect:** Sends a connection request. It appears as pending until the recipient accepts or declines it.
- **Requests:** Review incoming requests and accept or decline; sent requests show their pending state.
- **My connections:** Lists accepted connections. Request state and accepted relationships are stored in the backend.
- **Open a post:** Opens a larger post viewer with its image, caption, timestamp, comments, and like/comment controls. Close with the close button, click outside the viewer, or press Escape.
- When a profile is open, the Networking heading and search/filter bar are hidden; **Back to people** returns to the list.

The directory excludes the signed-in user and shows active profiles linked to user accounts. Only the request recipient can accept or decline a request.

### Settings

Settings is arranged around a title/save area, a preferences banner, section navigation, and a content panel.

- **Account:** Review account information. Use **Edit** to enable the editable name, phone, and location fields; email is read-only. Use **Save changes** to submit profile changes.
- **Security:** Explains that password changes are handled by a coordinator or administrator.
- **Notifications:** Toggle application updates, assignment notifications, event reminders, and community notifications.
- **Privacy:** Toggle profile visibility in volunteer search and sharing skills with organisers.
- **Update your preferences:** Opens the Notifications settings tab.
- **Save changes:** Saves editable profile fields. Notification and privacy toggles are stored locally in this browser.

### Notifications

Notifications uses an inbox layout:

- The list shows notification titles and times without exposing full message text.
- Select an item to open its full message; opening also marks it as read.
- Filter between **All** and **Unread**.
- Mark one item as read/unread, or use **Mark all as read**.
- The top-bar bell shows whether unread notifications exist.

Application, assignment and contribution notifications are derived from backend records. Likes, comments and connection activity are stored in `community_notifications`; read/unread state for those notifications is synchronized with the backend. The local read state for non-community status updates remains browser-specific.

### Administrator moderation

Signing in with an `Admin` account opens a moderation-only page rather than the volunteer workspace.

- Review the open report’s author, report reason, date and post content.
- **Dismiss report** closes it without changing the post.
- **Remove post** hides the post from the community feed and records the moderator and resolution in the database.

Only the backend’s `Admin` role can load or resolve the moderation queue.

## Data storage and sync

| Information | Where it is stored | Behavior |
|---|---|---|
| Sign-in, account profile, opportunities, applications, assignments, contributions | Hope Foundation API and database | Shared with the main system |
| Posts, images, comments, likes, connection requests, accepted connections, reports and social notifications | Hope Foundation API and database | Shared across users and devices; hidden posts remain available to moderation records |
| Volunteer directory | `volunteer_profiles` through the community API | Active, account-linked profiles only; private contact fields are not returned |
| Profile avatar and notification/privacy preference toggles | Browser `localStorage` | Local to this browser; avatar upload and preference synchronization are not implemented yet |
| Community notification read/unread state | Hope Foundation API and database | Synchronized across devices |
| Non-community notification read/unread state | Browser `localStorage` | Local to this browser |
| Navigation selection and search | Browser navigation state | Used to restore the current section/query |

Clearing browser site data removes local-only preferences and the profile avatar, but does not remove server-backed community activity or volunteer records.

## Responsive behavior and accessibility

The layout adapts to smaller screens: the sidebar becomes a menu, cards and columns stack, and the settings navigation becomes horizontally scrollable. Interactive controls are buttons or labeled form fields; post and notification viewers can be dismissed with Escape where supported.

## Developer checks

From the portal directory:

```powershell
npm run build
npx tsc --noEmit
```

The first command creates a production build; the second runs the TypeScript checker.
