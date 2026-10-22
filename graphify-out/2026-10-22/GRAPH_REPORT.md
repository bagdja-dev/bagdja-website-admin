# Graph Report - bagdja-website-admin  (2026-10-22)

## Corpus Check
- 109 files · ~80,229 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 794 nodes · 2171 edges · 34 communities (27 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: Graphify counters report 0 input · 0 output; semantic-agent token usage was not exposed by the agent tool.

`graphify-out/` is not ignored in this repository and will appear in `git status`. Add `graphify-out/` to `.gitignore`, or commit only the outputs your team wants to share.

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
7. `FormInput()` - 35 edges
8. `AppModal()` - 33 edges
9. `@heroui/react` - 33 edges
10. `hasMinRole()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `handleTopup()` --calls--> `formatCurrency()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/currency.ts
- `handleSubscribe()` --calls--> `apiClient()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/api-client.ts
- `handleCancel()` --calls--> `apiClient()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/api-client.ts
- `handleChangePlan()` --calls--> `apiClient()`  [EXTRACTED]
  app/dashboard/billing/page.tsx → app/lib/api-client.ts
- `POST()` --calls--> `getSession()`  [EXTRACTED]
  app/api/uploads/asset/route.ts → app/lib/session.ts

## Import Cycles
- None detected.

## Communities (34 total, 7 thin omitted)

### Community 0 - "Admin Page and Form Types"
Cohesion: 0.06
Nodes (100): useAlertDialog(), AppModal(), useConfirmDialog(), FormInput(), FormSwitch(), FormTextarea(), FulfillmentFieldInput(), FulfillmentFieldInputProps (+92 more)

### Community 1 - "Media Upload Components"
Cohesion: 0.05
Nodes (51): AudioUpload(), AudioUploadProps, CoverImageUpload(), CoverImageUploadProps, Model3DUpload(), Model3DUploadProps, ModelViewerElement(), ModelViewerElementProps (+43 more)

### Community 2 - "Reusable Form Fields"
Cohesion: 0.07
Nodes (51): BlogPostPicker(), BlogPostPickerProps, FlowPicker(), CheckIcon(), ChevronIcon(), CustomSelect(), CustomSelectProps, FormCheckboxGroupProps (+43 more)

### Community 3 - "Admin API and Session Types"
Cohesion: 0.07
Nodes (41): buildPath(), DELETE, GET, PATCH, POST, proxyRequest(), PUT, RouteContext (+33 more)

### Community 4 - "Dashboard UI Components"
Cohesion: 0.05
Nodes (43): LandingNavbar(), NAV_LINKS, NoWebsiteProps, ASSET_TABS, AssetTab, formatUpdatedAt(), getFileTypeLabel(), dateBeforeEvent() (+35 more)

### Community 5 - "Admin Cards and Actions"
Cohesion: 0.08
Nodes (33): desktopAddButtonClass, mobileFabPagePadding, MobileFloatingActionBarProps, PlusIcon(), ROLE_CHIP, STAT_ITEMS, WebsiteInitial(), CARD_THEMES (+25 more)

### Community 6 - "Support Chat Models"
Cohesion: 0.13
Nodes (29): AdminChatReferenceCard(), useRealtime(), CHANNEL_FILTERS, CHANNEL_TONE, ChatMessage, ChatsContent(), ChatsPage(), ChatThread (+21 more)

### Community 7 - "Theme Design Tokens"
Cohesion: 0.10
Nodes (30): ACCENT_TOKENS, applyPresetToTheme(), BODY_WEIGHTS, BodyWeight, COLOR_PARAM_MAP, darkenHex(), DEFAULT_TYPOGRAPHY, deriveColorsFromTheme() (+22 more)

### Community 8 - "Location Selection UI"
Cohesion: 0.11
Nodes (25): AreaSearchSelect(), AreaSearchSelectProps, ShippingAreaOption, FormCheckboxGroup(), FormCheckboxOption, COURIER_OPTIONS, formatAddress(), getTypeTheme() (+17 more)

### Community 9 - "Payment and Cart Metadata"
Cohesion: 0.09
Nodes (24): formatDate(), STATUS_TONE, StatusTone, TabKey, TABS, AddToCartPaymentMeta, EscrowPaymentMeta, EscrowSummary (+16 more)

### Community 10 - "Subscription Billing Models"
Cohesion: 0.12
Nodes (22): BillingAttempt, BillingPage(), BillingPageContent(), handleCancel(), handleChangePlan(), handleSubscribe(), handleTopup(), BLOCKING_STATUSES (+14 more)

### Community 11 - "Website Setup Wizard"
Cohesion: 0.15
Nodes (17): LogoUpload(), LogoUploadProps, ThemeCustomizer(), DomainRecordRow(), getOpeningHoursNote(), getSocialLink(), SettingsPage(), STEPS (+9 more)

### Community 12 - "Theme Customization UI"
Cohesion: 0.22
Nodes (18): ColorSchemeEditorProps, EmptyPreview(), InteractiveIframePreview(), PreviewToolbar(), PreviewViewport, StaticFallbackPreview(), TemplatePreview(), TemplatePreviewProps (+10 more)

### Community 13 - "Admin Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, framer-motion, @google/model-viewer, @heroui/react, next, react, react-dom, socket.io-client (+12 more)

### Community 14 - "Product Category UI"
Cohesion: 0.18
Nodes (15): CategorySelect(), closeMenu(), handleSearchKeyDown(), selectOption(), CategorySelectProps, DisplayOption, GalleryEditor(), formatCurrencyInput() (+7 more)

### Community 15 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Theme Editor Components"
Cohesion: 0.16
Nodes (16): ColorPickerField(), ColorPickerFieldProps, isValidHexInput(), ALL_THEME_EDITOR_TABS, COLOR_KEYS, ColorSchemeEditor(), ThemeEditorTab, ThemeMiniPreview() (+8 more)

### Community 17 - "Product Card Types"
Cohesion: 0.14
Nodes (17): buildMetadata(), formatCurrencyInput(), formatPrice(), getMetaHint(), getTypeTheme(), loadMetadataFields(), parseCurrencyInput(), ProductCard() (+9 more)

### Community 18 - "Rich Text Editor"
Cohesion: 0.17
Nodes (15): RichTextEditor(), RichTextEditorProps, ToolbarButton(), ToolbarButtons(), ToolbarSeparator(), @tiptap/extension-image, @tiptap/extension-link, @tiptap/extension-placeholder (+7 more)

### Community 19 - "Admin Package Scripts"
Cohesion: 0.12
Nodes (15): description, name, private, version, autoprefixer, eslint, eslint-config-next, framer-motion (+7 more)

### Community 20 - "Category Management Modal"
Cohesion: 0.27
Nodes (12): ChevronDownIcon(), ChevronUpIcon(), EyeIcon(), EyeSlashIcon(), ManageCategoriesModal(), handleDelete(), move(), notifyChanged() (+4 more)

### Community 21 - "Admin README"
Cohesion: 0.15
Nodes (13): Bagdja Auth, Bagdja Website Admin, Bagdja Website Builder, HeroUI React, Next.js 14 App Router, OAuth 2.0 with PKCE, Page Builder and Content CRUD, Phase 5 Authentication and Dashboard Features (+5 more)

### Community 22 - "Alert and Confirmation Dialogs"
Cohesion: 0.25
Nodes (9): AlertDialogView(), AlertDialogViewProps, AlertOptions, PendingAlert, ConfirmDialogView(), ConfirmDialogViewProps, ConfirmOptions, PendingConfirm (+1 more)

### Community 23 - "Application Modal Components"
Cohesion: 0.22
Nodes (9): AppModalProps, AppModalSize, SIZE_DEFAULT_WIDTH, ProductOption, ProductParentSelect(), closeMenu(), handleSearchKeyDown(), selectOption() (+1 more)

### Community 24 - "Frontend Tooling Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/react (+2 more)

### Community 25 - "Product Fulfillment Flows"
Cohesion: 0.29
Nodes (6): FormSelectOption, emptyRows(), ManageProductTypeFlowsModalProps, TypeRowState, FulfillmentFlow, PRODUCT_TYPE_LABELS

### Community 26 - "Development Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, typecheck

## Knowledge Gaps
- **23 isolated node(s):** `next/core-web-vitals`, `@tiptap/pm`, `framer-motion`, `@types/node`, `@types/react` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 285 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Media Upload Components` to `Admin Page and Form Types`, `Reusable Form Fields`, `Dashboard UI Components`, `Admin Cards and Actions`, `Support Chat Models`, `Location Selection UI`, `Payment and Cart Metadata`, `Subscription Billing Models`, `Website Setup Wizard`, `Product Category UI`, `Theme Editor Components`, `Product Card Types`, `Rich Text Editor`, `Admin Package Scripts`, `Category Management Modal`, `Alert and Confirmation Dialogs`, `Application Modal Components`, `Product Fulfillment Flows`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `@tiptap/pm`, `framer-motion` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Page and Form Types` be split into smaller, more focused modules?**
  _Cohesion score 0.05733005733005733 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Dashboard UI Components` to `Admin Page and Form Types`, `Media Upload Components`, `Reusable Form Fields`, `Admin API and Session Types`, `Admin Cards and Actions`, `Support Chat Models`, `Payment and Cart Metadata`, `Subscription Billing Models`, `Website Setup Wizard`, `Admin Package Scripts`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Should `Media Upload Components` be split into smaller, more focused modules?**
  _Cohesion score 0.0539906103286385 - nodes in this community are weakly interconnected._
- **Why does `@heroui/react` connect `Dashboard UI Components` to `Admin Page and Form Types`, `Media Upload Components`, `Reusable Form Fields`, `Admin Cards and Actions`, `Support Chat Models`, `Location Selection UI`, `Payment and Cart Metadata`, `Subscription Billing Models`, `Website Setup Wizard`, `Theme Customization UI`, `Theme Editor Components`, `Product Card Types`, `Admin Package Scripts`, `Product Fulfillment Flows`, `Tailwind Configuration`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Reusable Form Fields` be split into smaller, more focused modules?**
  _Cohesion score 0.06949152542372881 - nodes in this community are weakly interconnected._