# Manter — Client Implementation Plan
## React Native (Expo) — iOS & Android

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React Native + Expo (Managed) | Single codebase for iOS + Android; EAS Build handles native production builds |
| Navigation | Expo Router v3 | File-based routing, cleaner than manual stack setup |
| State | Zustand | Lightweight, no Redux boilerplate; 5 stores is the right scale for v1 |
| Server State | @tanstack/react-query | Caching, background refetch, pagination out of the box |
| HTTP Client | Axios | Interceptor support for automatic JWT refresh |
| Real-time | socket.io-client | Matches server's Socket.io; room-based chat |
| Forms | react-hook-form + zod | Schema-based validation, minimal re-renders |

---

## Folder Structure

```
client/
├── app.json                          # Expo config (bundle ID, splash, icons)
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── .env                              # API_URL, SOCKET_URL
├── assets/
│   ├── fonts/
│   ├── images/
│   │   ├── logo.png
│   │   ├── splash.png
│   │   └── onboarding/               # 3 onboarding slide images
│   └── icons/
│
├── src/
│   ├── constants/
│   │   ├── qualities.ts              # All 23 green-flag qualities (id, code, label, category, weight)
│   │   ├── colors.ts                 # Brand palette — warm, trustworthy tones for women
│   │   ├── typography.ts
│   │   └── config.ts                 # API_BASE_URL, socket URL, feature flags
│   │
│   ├── types/
│   │   ├── user.types.ts             # User, WomanProfile, ManProfile interfaces
│   │   ├── match.types.ts            # Match, QualityScore, CompatibilityReport
│   │   ├── chat.types.ts             # Message, Conversation, RedFlagAlert
│   │   ├── review.types.ts           # CommunityRating, BehaviorReport
│   │   └── api.types.ts              # ApiResponse<T>, PaginatedResponse<T>
│   │
│   ├── api/
│   │   ├── client.ts                 # Axios instance + JWT refresh interceptor
│   │   ├── auth.api.ts               # login, register, refreshToken, logout
│   │   ├── users.api.ts              # getProfile, updateProfile, uploadPhoto
│   │   ├── matching.api.ts           # getCandidates, swipe, getMatches
│   │   ├── chat.api.ts               # getConversations, getMessages, sendMessage
│   │   ├── review.api.ts             # submitRating, getCommunityScore, reportUser
│   │   ├── ai.api.ts                 # analyzeScreenshot, getRedFlags
│   │   └── verification.api.ts       # requestIDVerification, checkStatus
│   │
│   ├── store/                        # Zustand stores
│   │   ├── auth.store.ts             # user session, tokens, role
│   │   ├── profile.store.ts          # own profile state
│   │   ├── matching.store.ts         # candidate queue, liked/passed
│   │   ├── chat.store.ts             # conversations, unread counts
│   │   └── notifications.store.ts    # push notification state
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useMatching.ts
│   │   ├── useSocket.ts              # Socket.io connection lifecycle
│   │   ├── useRedFlagScan.ts         # AI screenshot analysis trigger
│   │   ├── useQualityScore.ts        # Compute compatibility % from 23 qualities
│   │   └── useCommunityRating.ts
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx         # Auth vs App stack switcher
│   │   ├── AuthNavigator.tsx         # Onboarding + login/signup
│   │   ├── AppNavigator.tsx          # Bottom tab navigator
│   │   ├── DiscoverNavigator.tsx     # Stack inside Discover tab
│   │   ├── ChatNavigator.tsx         # Stack inside Chat tab
│   │   └── ProfileNavigator.tsx      # Stack inside Profile tab
│   │
│   ├── screens/
│   │   │
│   │   ├── auth/
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── OnboardingScreen.tsx           # 3-slide value prop intro
│   │   │   ├── RoleSelectScreen.tsx           # "I'm a woman" / "I'm a man"
│   │   │   ├── WomanSignupScreen.tsx          # email, name, age, photos
│   │   │   ├── ManSignupScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── ForgotPasswordScreen.tsx
│   │   │   │
│   │   │   ├── woman-onboarding/
│   │   │   │   ├── WomanQualitiesSetupScreen.tsx   # Rate importance of each of 23 qualities (1–5)
│   │   │   │   ├── WomanDealbreakersScreen.tsx     # Mark hard dealbreakers
│   │   │   │   └── WomanPreferencesScreen.tsx      # Age range, distance, filters
│   │   │   │
│   │   │   └── man-onboarding/
│   │   │       ├── ManQualitySelfRateScreen.tsx    # Man self-rates on 23 qualities
│   │   │       ├── ManVerificationScreen.tsx        # ID/background check prompt
│   │   │       ├── ManBehaviorQuizScreen.tsx        # 5 scenario-based questions
│   │   │       └── ManPhotoGuidelinesScreen.tsx     # Photo requirements
│   │   │
│   │   ├── discover/
│   │   │   ├── DiscoverScreen.tsx             # Animated swipe card feed
│   │   │   ├── ManProfileDetailScreen.tsx     # Full profile with quality spider chart
│   │   │   ├── QualityBreakdownScreen.tsx     # Radar chart of 23 qualities
│   │   │   └── CommunityReviewsScreen.tsx     # Anonymous women's reviews of this man
│   │   │
│   │   ├── matches/
│   │   │   ├── MatchesScreen.tsx              # All active matches list
│   │   │   └── NewMatchCelebrationScreen.tsx  # Match animation modal
│   │   │
│   │   ├── chat/
│   │   │   ├── ConversationsScreen.tsx        # All active conversations
│   │   │   ├── ChatScreen.tsx                 # Real-time 1:1 chat
│   │   │   ├── RedFlagAlertScreen.tsx         # Full AI warning detail modal
│   │   │   └── ChatAnalysisScreen.tsx         # Upload screenshot for AI scan
│   │   │
│   │   ├── community/
│   │   │   ├── CommunityScreen.tsx            # Tea-style women forum
│   │   │   ├── RateAManScreen.tsx             # Rate man's qualities after date
│   │   │   ├── ManReputationScreen.tsx        # Community score breakdown
│   │   │   └── ReportScreen.tsx              # Report bad behavior
│   │   │
│   │   ├── profile/
│   │   │   ├── MyProfileScreen.tsx            # Woman's own profile editor
│   │   │   ├── EditProfileScreen.tsx
│   │   │   ├── ManProfileScreen.tsx           # Man's own profile editor
│   │   │   ├── QualityScoreViewScreen.tsx     # Man sees his green flag score
│   │   │   ├── VerificationStatusScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── PrivacySettingsScreen.tsx      # Screenshot block toggle
│   │   │   ├── BlockedUsersScreen.tsx
│   │   │   └── SafetyResourcesScreen.tsx
│   │   │
│   │   └── safety/
│   │       ├── SafetyCheckInScreen.tsx        # Timed check-in before first dates
│   │       └── EmergencyContactScreen.tsx     # Save 2 emergency contacts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx                     # Primary, secondary, danger variants
│   │   │   ├── Input.tsx                      # Controlled input with validation
│   │   │   ├── Avatar.tsx                     # Profile photo with verification badge
│   │   │   ├── Badge.tsx                      # "Verified", "Green Flag", score badges
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── cards/
│   │   │   ├── ManCard.tsx                    # Swipeable profile card
│   │   │   ├── QualityPill.tsx                # Single quality tag
│   │   │   ├── GreenFlagScoreBadge.tsx        # Large score display (e.g. 87%)
│   │   │   └── MatchCard.tsx                  # Compact match list item
│   │   │
│   │   ├── charts/
│   │   │   ├── QualitySpiderChart.tsx         # Radar chart of 23 qualities
│   │   │   ├── ScoreBreakdownBar.tsx          # Per-category score bars
│   │   │   └── CompatibilityMeter.tsx         # Woman's priorities vs man's scores
│   │   │
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── TypingIndicator.tsx
│   │   │   ├── RedFlagBanner.tsx              # Inline AI warning in chat
│   │   │   └── ChatInputBar.tsx               # Input with AI scan button
│   │   │
│   │   └── safety/
│   │       ├── VerificationBadge.tsx          # ID verified indicator
│   │       ├── BackgroundCheckBadge.tsx
│   │       └── RedFlagWarning.tsx             # Full-screen warning overlay
│   │
│   └── utils/
│       ├── qualityScorer.ts                   # Weighted score per quality
│       ├── compatibilityCalc.ts               # Woman's priorities × Man's scores → compatibility %
│       ├── validators.ts                       # Zod schemas for all forms
│       ├── dateUtils.ts
│       ├── imageUtils.ts                       # Compression before upload
│       └── socketClient.ts                    # Socket.io singleton
```

---

## The 23 Qualities — `src/constants/qualities.ts`

```typescript
// Mirrors quality_definitions table in the server DB
export const QUALITIES = [
  // Respect & Autonomy
  { id: 1,  code: 'respects_decisions',       label: 'Respects Her Decisions',        category: 'respect' },
  { id: 2,  code: 'protects_not_controls',    label: 'Protects, Doesn\'t Control',    category: 'respect' },
  { id: 11, code: 'respects_boundaries',      label: 'Respects Boundaries',           category: 'respect' },
  // Support & Loyalty
  { id: 3,  code: 'supportive_of_success',    label: 'Supportive of Her Growth',      category: 'support' },
  { id: 4,  code: 'loyal_and_trustworthy',    label: 'Loyal, Honest & Trustworthy',   category: 'support' },
  { id: 6,  code: 'takes_stand',              label: 'Stands Up for Her',             category: 'support' },
  // Emotional Maturity
  { id: 9,  code: 'emotional_intelligence',   label: 'Emotionally Intelligent',       category: 'emotional' },
  { id: 14, code: 'expresses_emotions',       label: 'Expresses Emotions Openly',     category: 'emotional' },
  { id: 18, code: 'no_anger_issues',          label: 'Calm, No Anger Issues',         category: 'emotional' },
  // Presence & Connection
  { id: 5,  code: 'vibe_match',               label: 'Matching Vibe & Thoughts',      category: 'connection' },
  { id: 7,  code: 'notices_small_things',     label: 'Notices Small Details',         category: 'connection' },
  { id: 10, code: 'sense_of_humor',           label: 'Sense of Humor',                category: 'connection' },
  { id: 12, code: 'safe_comfortable_presence','Safe & Comfortable Presence',          category: 'connection' },
  // Social Character
  { id: 13, code: 'confident_self_respect',   label: 'Confident & Self-Respecting',   category: 'character' },
  { id: 16, code: 'no_misogyny',              label: 'No Misogyny in Social Settings',category: 'character' },
  { id: 21, code: 'basic_manners',            label: 'Basic Manners & Non-Judgmental',category: 'character' },
  { id: 22, code: 'humble',                   label: 'Humble & Down to Earth',        category: 'character' },
  { id: 23, code: 'no_ego',                   label: 'No Ego',                        category: 'character' },
  // Practical Partnership
  { id: 15, code: 'understands_womanhood',    label: 'Understands Women\'s Health',   category: 'practical' },
  { id: 19, code: 'shares_household',         label: '50-50 Household & Cooking',     category: 'practical' },
  { id: 20, code: 'reliable',                 label: 'Reliable — Keeps His Word',     category: 'practical' },
  // Future & Patience
  { id: 8,  code: 'patient',                  label: 'Patient, Gives Space',          category: 'future' },
  { id: 17, code: 'ambitious',                label: 'Ambitious & Futuristic',        category: 'future' },
] as const;
```

---

## Compatibility Algorithm — `src/utils/compatibilityCalc.ts`

```typescript
// Woman's quality priorities (1–5) × Man's quality scores (1–5)
// Returns overall compatibility percentage

export function computeCompatibility(
  womanPriorities: { qualityId: number; priority: number; isDealbreaker: boolean }[],
  manScores: { qualityId: number; finalScore: number }[]
): { percentage: number; breakdown: Record<string, number> } {

  const scoreMap = new Map(manScores.map(s => [s.qualityId, s.finalScore]));
  let weightedTotal = 0;
  let maxPossible = 0;

  for (const { qualityId, priority, isDealbreaker } of womanPriorities) {
    const manScore = scoreMap.get(qualityId) ?? 1;
    // Dealbreaker with low score → 0% compatibility immediately
    if (isDealbreaker && manScore < 3.0) return { percentage: 0, breakdown: {} };
    weightedTotal += manScore * priority;
    maxPossible += 5 * priority;
  }

  const raw = (weightedTotal / maxPossible) * 100;

  // Bonus modifiers applied by server — client shows final percentage
  return { percentage: Math.min(Math.round(raw), 100), breakdown: {} };
}
```

---

## Libraries

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "^3.0.0",
    "react-native": "0.74.x",
    "react-native-reanimated": "~3.10.x",
    "react-native-gesture-handler": "~2.16.x",
    "zustand": "^4.5.x",
    "@tanstack/react-query": "^5.x",
    "axios": "^1.7.x",
    "socket.io-client": "^4.7.x",
    "zod": "^3.23.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "expo-image-picker": "~15.x",
    "expo-image-manipulator": "~12.x",
    "expo-secure-store": "~13.x",
    "expo-local-authentication": "~14.x",
    "expo-screen-capture": "~7.x",
    "expo-notifications": "~0.28.x",
    "react-native-text-recognition": "^1.x",
    "victory-native": "^41.x",
    "@shopify/flash-list": "^1.6.x",
    "react-native-maps": "^1.14.x",
    "dayjs": "^1.11.x"
  }
}
```

---

## Development Phases

### Phase 1 — Foundation (Week 1–2)
1. `npx create-expo-app client --template expo-template-blank-typescript`
2. Install all dependencies
3. Set up Expo Router: `app/` directory with `_layout.tsx`, tab navigator
4. Build auth screens: Splash → Onboarding → RoleSelect → Login/Signup
5. Implement `auth.store.ts` (Zustand) + `auth.api.ts` (Axios)
6. Set up `expo-secure-store` for JWT, configure refresh interceptor in `client.ts`
7. Test: register as woman, register as man, login, token refresh

### Phase 2 — Profiles & Qualities (Week 3–4)
8. Build `WomanQualitiesSetupScreen` — slider or star picker for each of 23 qualities
9. Build `WomanDealbreakersScreen` — toggle dealbreakers
10. Build `ManQualitySelfRateScreen` — same UI, man rates himself
11. Build `ManBehaviorQuizScreen` — 5 scenario questions with multiple choice
    - Example: "Your partner says she wants to keep her surname after marriage. You..."
    - Example: "She gets a job offer in another city that pays 3× your salary. You..."
12. Build `ManProfileDetailScreen` + `QualitySpiderChart` (victory-native radar chart)
13. Photo upload: `expo-image-picker` → compress → `POST /api/v1/profiles/me/photos`

### Phase 3 — Matching (Week 5–6)
14. Build `DiscoverScreen` with swipe cards using Reanimated + GestureHandler
15. Animate: card tilts on drag, green check on right swipe, red X on left swipe
16. Implement swipe → `POST /api/v1/matching/swipe` → check for mutual match
17. Socket: listen for `match:new` event → show `NewMatchCelebrationScreen` modal
18. Build `MatchesScreen` list

### Phase 4 — Real-time Chat (Week 7–8)
19. Build `ConversationsScreen` with `@shopify/flash-list`
20. Build `ChatScreen`: connect Socket.io room, send/receive messages in real time
21. Implement typing indicators (`chat:typing` event)
22. Implement read receipts (`chat:read` event)
23. Add `RedFlagBanner` — subtle inline warning when server emits `redflag:alert`

### Phase 5 — AI Red Flag Scanner (Week 9)
24. Build `ChatAnalysisScreen`: user picks screenshot from gallery
25. Run OCR client-side using `react-native-text-recognition` (no raw image sent to server)
26. Send extracted text to `POST /api/v1/ai/analyze-screenshot`
27. Display result in `RedFlagAlertScreen` with severity, detected behaviors, and recommendation
28. Add AI scan button in `ChatInputBar` to trigger live conversation analysis

### Phase 6 — Community (Week 10)
29. Build `RateAManScreen` — per-quality star rating post-date
30. Build `CommunityReviewsScreen` — anonymous aggregated ratings with context notes
31. Build `ManReputationScreen` — full reputation score with spider chart

### Phase 7 — Safety (Week 11)
32. Build `SafetyCheckInScreen` — set a timer (e.g. 2 hours) before first date
33. If check-in missed → app sends push alert to emergency contacts via server
34. Build `EmergencyContactScreen` — store 2 contacts
35. Enable `expo-screen-capture` block in chat screens
36. Add biometric lock on app resume with `expo-local-authentication`
37. Build `ReportScreen` — report with category + description + screenshot evidence

### Phase 8 — Polish & Launch (Week 12)
38. Push notifications: register device with `expo-notifications`, handle in-app
39. Build `SettingsScreen` + `PrivacySettingsScreen`
40. Add empty states and error boundaries to all screens
41. Configure EAS Build for iOS (TestFlight) and Android (Play Store internal)
42. Submit for App Store review

---

## Key Design Decisions

**Expo Managed Workflow** over bare React Native: handles camera, notifications, biometrics, and secure storage without needing Xcode/Android Studio config during dev. EAS Build produces production-ready native builds.

**Zustand over Redux**: 5 state domains, clear boundaries. Redux would be 3× the boilerplate for the same outcome.

**Client-side OCR before AI scan**: Screenshots of private conversations never leave the device as images. Only extracted text goes to the Claude API — privacy-first by design.

**Women-only community ratings**: `requireRole('woman')` enforced server-side. Men cannot rate, review, or submit community data of any kind. This prevents manipulation of reputation scores.

**Dealbreaker = instant zero**: If a woman marks a quality as a dealbreaker and a man scores below 3.0 on it, his compatibility score is 0 regardless of other scores. This is surfaced clearly in the UI so women understand why a candidate doesn't appear.
