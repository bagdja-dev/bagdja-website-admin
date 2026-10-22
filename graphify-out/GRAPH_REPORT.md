# Graph Report - bagdja-website-admin  (2026-10-22)

## Corpus Check
- 105 files · ~79,698 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 784 nodes · 2151 edges · 34 communities (27 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `193b9f58`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Admin Page and Form Types
- Media Upload Components
- Reusable Form Fields
- Admin API and Session Types
- Dashboard UI Components
- Admin Cards and Actions
- Support Chat Models
- Theme Design Tokens
- Location Selection UI
- Payment and Cart Metadata
- Subscription Billing Models
- Website Setup Wizard
- Theme Customization UI
- Admin Dependencies
- Product Category UI
- TypeScript Compiler Config
- Theme Editor Components
- Product Card Types
- Rich Text Editor
- Admin Package Scripts
- Category Management Modal
- Admin README
- Alert and Confirmation Dialogs
- Application Modal Components
- Frontend Tooling Dependencies
- Product Fulfillment Flows
- Development Scripts
- Shared API Client
- ESLint Configuration
- Next.js Configuration
- Tailwind Configuration
- Shopping Cart Logo
- Google Site Verification

## God Nodes (most connected - your core abstractions)
1. `apiClient()` - 70 edges
2. `react` - 59 edges
3. `useWebsiteContext()` - 57 edges
4. `LoadingSpinner()` - 53 edges
5. `NoWebsiteState()` - 39 edges
6. `next` - 37 edges
7. `AppModal()` - 33 edges
8. `FormInput()` - 33 edges
9. `@heroui/react` - 33 edges
10. `hasMinRole()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `handleSubscribe()` --calls--> `apiClient()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/api-client.ts
- `handleCancel()` --calls--> `apiClient()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/api-client.ts
- `handleChangePlan()` --calls--> `apiClient()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/api-client.ts
- `POST()` --calls--> `getSession()`  [EXTRACTED]
  app/api/uploads/asset/route.ts → app/lib/session.ts
- `POST()` --calls--> `getSession()`  [EXTRACTED]
  app/api/uploads/logo/route.ts → app/lib/session.ts

## Import Cycles
- None detected.

## Communities (34 total, 7 thin omitted)

### Community 0 - "Admin Page and Form Types"
Cohesion: 0.07
Nodes (69): ColorSchemeEditorProps, FormInput(), FormTextarea(), LoadingSpinner(), LogoUpload(), LogoUploadProps, NoWebsiteState(), EmptyPreview() (+61 more)

### Community 1 - "Media Upload Components"
Cohesion: 0.06
Nodes (49): AreaSearchSelectProps, ShippingAreaOption, AudioUpload(), AudioUploadProps, formatNotificationTime(), NotificationBell(), WebsiteNotification, NotificationToaster() (+41 more)

### Community 2 - "Reusable Form Fields"
Cohesion: 0.15
Nodes (26): BlogPostPicker(), BlogPostPickerProps, GalleryEditorProps, ProductPicker(), ProductPickerProps, PageSectionsEditor(), SectionCard(), SectionCardProps (+18 more)

### Community 3 - "Admin API and Session Types"
Cohesion: 0.07
Nodes (42): buildPath(), DELETE, GET, PATCH, POST, proxyRequest(), PUT, RouteContext (+34 more)

### Community 4 - "Dashboard UI Components"
Cohesion: 0.21
Nodes (11): formatDate(), OrdersPage(), STATUS_TONE, StatusTone, TabKey, TABS, vendorNamesFor(), VendorOption (+3 more)

### Community 5 - "Admin Cards and Actions"
Cohesion: 0.05
Nodes (58): LandingNavbar(), NAV_LINKS, desktopAddButtonClass, mobileFabPagePadding, MobileFloatingActionBar(), MobileFloatingActionBarProps, PlusIcon(), NoWebsiteProps (+50 more)

### Community 6 - "Support Chat Models"
Cohesion: 0.13
Nodes (28): AdminChatReferenceCard(), CHANNEL_FILTERS, CHANNEL_TONE, ChatMessage, ChatsContent(), ChatsPage(), ChatThread, ChipTone (+20 more)

### Community 7 - "Theme Design Tokens"
Cohesion: 0.07
Nodes (48): ColorPickerField(), ColorPickerFieldProps, isValidHexInput(), ALL_THEME_EDITOR_TABS, COLOR_KEYS, ColorSchemeEditor(), ThemeEditorTab, ThemeMiniPreview() (+40 more)

### Community 8 - "Location Selection UI"
Cohesion: 0.16
Nodes (22): AreaSearchSelect(), FormCheckboxGroup(), COURIER_OPTIONS, formatAddress(), getTypeTheme(), LocationCard(), LocationCardProps, LocationsManagement() (+14 more)

### Community 9 - "Payment and Cart Metadata"
Cohesion: 0.09
Nodes (21): AddToCartPaymentMeta, EscrowPaymentMeta, EscrowSummary, FaqCategory, FulfillmentFlowStep, FulfillmentStepFormFieldFilledBy, LOCATION_TYPE_LABELS, LocationType (+13 more)

### Community 10 - "Subscription Billing Models"
Cohesion: 0.07
Nodes (39): BillingAttempt, BillingPage(), BillingPageContent(), handleCancel(), handleChangePlan(), handleSubscribe(), handleTopup(), BLOCKING_STATUSES (+31 more)

### Community 11 - "Website Setup Wizard"
Cohesion: 0.15
Nodes (19): buildGroupSteps(), CancelledPreorderDetail, formatDate(), GroupStepItemView, groupStepKey(), GroupStepView, isStepBuyerOwned(), OrderDetailPage() (+11 more)

### Community 12 - "Theme Customization UI"
Cohesion: 0.27
Nodes (7): CoverImageUpload(), CoverImageUploadProps, VideoUpload(), VideoUploadProps, uploadAsset(), UploadAssetResult, UploadError

### Community 13 - "Admin Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, framer-motion, @google/model-viewer, @heroui/react, next, react, react-dom, socket.io-client (+12 more)

### Community 14 - "Product Category UI"
Cohesion: 0.06
Nodes (63): AppModal(), AppModalProps, AppModalSize, SIZE_DEFAULT_WIDTH, CategorySelect(), closeMenu(), handleSearchKeyDown(), selectOption() (+55 more)

### Community 15 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Theme Editor Components"
Cohesion: 0.18
Nodes (9): formatDate(), STATUS_TONE, StatusTone, TabKey, TABS, SUPPORTED_CURRENCIES, TagihanListItem, TagihanListResponse (+1 more)

### Community 17 - "Product Card Types"
Cohesion: 0.32
Nodes (5): Model3DUpload(), Model3DUploadProps, ModelViewerElement(), ModelViewerElementProps, @google/model-viewer

### Community 18 - "Rich Text Editor"
Cohesion: 0.83
Nodes (4): RichTextEditor(), ToolbarButton(), ToolbarButtons(), ToolbarSeparator()

### Community 19 - "Admin Package Scripts"
Cohesion: 0.10
Nodes (25): RichTextEditorProps, description, name, private, version, autoprefixer, eslint, eslint-config-next (+17 more)

### Community 20 - "Category Management Modal"
Cohesion: 0.11
Nodes (30): ConfirmDialogView(), ConfirmDialogViewProps, ConfirmOptions, PendingConfirm, useConfirmDialog(), ChevronDownIcon(), ChevronUpIcon(), EyeIcon() (+22 more)

### Community 21 - "Admin README"
Cohesion: 0.15
Nodes (13): Bagdja Auth, Bagdja Website Admin, Bagdja Website Builder, HeroUI React, Next.js 14 App Router, OAuth 2.0 with PKCE, Page Builder and Content CRUD, Phase 5 Authentication and Dashboard Features (+5 more)

### Community 22 - "Alert and Confirmation Dialogs"
Cohesion: 0.43
Nodes (6): AlertDialogView(), AlertDialogViewProps, AlertOptions, PendingAlert, useAlertDialog(), react-dom

### Community 23 - "Application Modal Components"
Cohesion: 0.38
Nodes (6): FulfillmentFieldInput(), FulfillmentFieldInputProps, MediaValue, normalizeMediaValues(), StepFieldState, FulfillmentStepFormField

### Community 24 - "Frontend Tooling Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/react (+2 more)

### Community 25 - "Product Fulfillment Flows"
Cohesion: 0.67
Nodes (3): FulfillmentFieldValue(), MediaValue, normalizeMediaValues()

### Community 26 - "Development Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

## Knowledge Gaps
- **23 isolated node(s):** `next/core-web-vitals`, `@tiptap/pm`, `framer-motion`, `@types/node`, `@types/react` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 282 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Media Upload Components` to `Admin Page and Form Types`, `Reusable Form Fields`, `Dashboard UI Components`, `Admin Cards and Actions`, `Support Chat Models`, `Theme Design Tokens`, `Location Selection UI`, `Subscription Billing Models`, `Website Setup Wizard`, `Theme Customization UI`, `Product Category UI`, `Theme Editor Components`, `Product Card Types`, `Admin Package Scripts`, `Category Management Modal`, `Alert and Confirmation Dialogs`, `Application Modal Components`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `@tiptap/pm`, `framer-motion` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Page and Form Types` be split into smaller, more focused modules?**
  _Cohesion score 0.06635802469135803 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Admin Cards and Actions` to `Admin Page and Form Types`, `Media Upload Components`, `Reusable Form Fields`, `Admin API and Session Types`, `Dashboard UI Components`, `Support Chat Models`, `Subscription Billing Models`, `Website Setup Wizard`, `Theme Editor Components`, `Admin Package Scripts`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Should `Media Upload Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06321334503950835 - nodes in this community are weakly interconnected._
- **Why does `@heroui/react` connect `Admin Cards and Actions` to `Admin Page and Form Types`, `Media Upload Components`, `Reusable Form Fields`, `Dashboard UI Components`, `Support Chat Models`, `Theme Design Tokens`, `Location Selection UI`, `Subscription Billing Models`, `Website Setup Wizard`, `Product Category UI`, `Theme Editor Components`, `Admin Package Scripts`, `Category Management Modal`, `Tailwind Configuration`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Reusable Form Fields` be split into smaller, more focused modules?**
  _Cohesion score 0.14838709677419354 - nodes in this community are weakly interconnected._