---
name: Sortmate
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  bg-primary: '#FFFFFF'
  bg-secondary: '#F8FAFC'
  surface-border: '#E2E8F0'
  text-main: '#0F172A'
  text-muted: '#64748B'
  vault-blur: rgba(255, 255, 255, 0.4)
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 4px
  container-padding: 20px
  stack-gap-sm: 8px
  stack-gap-md: 16px
  stack-gap-lg: 24px
  grid-gutter: 12px
---

## Brand & Style

The brand personality is **intelligent, proactive, and secure**. It functions as a high-end digital assistant that does more than just store; it interprets and curates. The UI must evoke a sense of **calm order** and **professional reliability**, transforming the "digital clutter" of screenshots and links into an organized, searchable asset library.

The chosen design style is **Corporate / Modern Minimalism**. It prioritizes clarity and efficiency through a systematic grid, generous whitespace, and refined typography. To differentiate from standard utility apps, the system incorporates **subtle tactile depth**—using soft, diffused shadows and layered surfaces—to make the digital content feel like tangible, organized cards in a physical drawer.

**Key Emotional Responses:**
*   **Relief:** Clutter is automatically handled.
*   **Trust:** Sensitive data is visibly protected (Secret Vault).
*   **Clarity:** Information is presented with high legibility and clear hierarchies.

## Colors

The palette is anchored by **Indigo-600** as the primary color, symbolizing intelligence and established trust. The background environment is intentionally quiet, utilizing a "Paper and Slate" approach with clean whites (`#FFFFFF`) and very soft blue-grays (`#F8FAFC`) to ensure the user's content (photos/screenshots) remains the focal point.

**Functional Color Mapping:**
*   **Primary (Indigo):** Brand presence, primary actions, and active states.
*   **Secondary (Emerald):** Success states and "Value" categories like coupons or saved rewards.
*   **Tertiary (Amber):** Warnings, expiring items, and "Attention Required" alerts.
*   **Neutral (Slate):** General documentation, metadata, and secondary navigation.

The "Secret Vault" utilizes a unique visual treatment involving high-alpha blurs and Slate-900 overlays to create a distinct psychological "secure zone."

## Typography

The system uses **Hanken Grotesk** for its modern, sharp, and highly legible characteristics. It feels contemporary and "tech-forward" while remaining approachable. For technical metadata and system labels (like "EXPIRY DATE" or "FILE SIZE"), **JetBrains Mono** is introduced to provide a structured, "assistant-processed" aesthetic.

**Hierarchy Rules:**
*   **Display/Headlines:** High weight (600-700) with slight negative letter-spacing to feel tight and authoritative.
*   **Body Text:** Optimized for reading efficiency at 16px for primary descriptions and 14px for secondary data.
*   **Labels:** All-caps monospaced type for system-generated tags to distinguish them from user-generated content.

## Layout & Spacing

This is a **mobile-first, 4px-grid system**. The layout relies on a **Fluid Grid** for galleries and a **Structured List** for management views. 

**Layout Specifics:**
*   **Margins:** 20px horizontal margins for all main views to provide "breathing room" on mobile devices.
*   **Grid:** 2-column or 3-column layouts for the Library, using a 12px gutter to ensure content feels grouped but distinct.
*   **The "Main Action" Layer:** The '+' button is housed in a floating bottom-action bar, centered and elevated above the 5-tab navigation.
*   **Safe Areas:** Bottom navigation accounts for OS-level home indicators with a minimum 34px bottom padding.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Ambient Shadows**. 

*   **Level 0 (Base):** Background (`#F8FAFC`).
*   **Level 1 (Cards):** Surface (`#FFFFFF`) with a very soft, multi-layered shadow (e.g., `0px 2px 4px rgba(0,0,0,0.05), 0px 10px 20px rgba(0,0,0,0.02)`).
*   **Level 2 (Modals/Action Sheets):** Higher contrast shadow with a background dim (`overlay.dim`).
*   **Level 3 (Floating Action Button):** High-contrast primary color background with a matching tinted shadow (Indigo-200) to signify its importance.

The "Secret Vault" uses a **Backdrop Blur** (20px) on thumbnails to indicate sensitive content that hasn't been unlocked yet.

## Shapes

The shape language is **Rounded**, moving away from "soft" to a more "structural" feel that fits a modern assistant.

*   **Standard Cards:** 16px border radius is the default for all content cards.
*   **Action Buttons:** 12px for standard buttons; the main '+' button is a perfect circle (pill).
*   **Chips/Tags:** Pill-shaped (fully rounded) to differentiate them from interactive card elements.
*   **Input Fields:** 12px border radius with a 1px Slate-200 border, transitioning to a 2px Indigo border on focus.

## Components

### Buttons
*   **Primary:** Indigo background, white text, 12px radius. High-emphasis.
*   **Secondary:** White background, Indigo border/text. Low-emphasis.
*   **Main Action (+):** Large circular button, Indigo background, 24px icon. Shadow is tinted Indigo.

### Cards
*   **Content Card:** 16px radius, Level 1 shadow. Contains a thumbnail (top) and metadata (bottom).
*   **Cleanup Card:** Includes a leading icon (e.g., Amber for expiry) and a trailing chevron or action button.

### Chips
*   **AI Tag:** Pill-shaped, light Indigo background with Indigo text.
*   **Status Badge:** Emerald (Success), Amber (Warning), or Slate (Neutral) background with white text, 10px font size.

### Inputs
*   **Search Bar:** Fully rounded (pill), Slate-100 background, leading "Search" icon, placeholder text in Slate-400.
*   **PIN Entry:** Large, high-contrast digits with 16px rounded containers; shakes horizontally on error.

### Lists
*   **Management List:** High-density, 1px Slate-50 bottom dividers. Items include a 48px square thumbnail with a 4px radius.

### Feedback
*   **Toasts:** Bottom-aligned, 12px radius, Slate-900 background for high contrast against the light UI.