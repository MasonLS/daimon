# Daimon Style Guide

## Brand Overview

Daimon is an AI writing companion for serious writers and bloggers. The AI never writes for users or suggests phrasing—instead, it prompts with ideas and references to source material. The name "Daimon" references the ancient Greek concept of a guiding spirit or inner voice.

### Design Philosophy

- **Literary & Editorial**: Warm, sophisticated aesthetic inspired by traditional publishing
- **Subtle & Supportive**: The AI is a whisper, not a shout—design reflects this restraint
- **Warm & Inviting**: Parchment tones create a comfortable writing environment

---

## Typography

### Font Stack

| Usage | Font | CSS Variable |
|-------|------|--------------|
| Display/Headings | Cormorant Garamond | `--font-display` |
| Body/Editor | Crimson Pro | `--font-serif` |
| UI Elements | Source Sans 3 | `--font-sans` |

### Usage Examples

```css
/* Page titles */
font-family: var(--font-display);

/* Document content, article text */
font-family: var(--font-serif);

/* Buttons, labels, navigation */
font-family: var(--font-sans);
```

---

## Color Palette

### Light Mode (Parchment Study)

| Token | Description | Value |
|-------|-------------|-------|
| `--background` | Page background | Warm off-white parchment |
| `--foreground` | Primary text | Warm dark brown |
| `--muted` | Subtle backgrounds | Light warm stone |
| `--muted-foreground` | Secondary text | Medium warm gray |
| `--card` | Card backgrounds | Cream white |
| `--border` | Borders | Warm stone with transparency |

### Dark Mode (Candlelit Study)

| Token | Description | Value |
|-------|-------------|-------|
| `--background` | Page background | Deep warm brown |
| `--foreground` | Primary text | Warm cream |
| `--muted` | Subtle backgrounds | Darker warm brown |
| `--muted-foreground` | Secondary text | Muted warm tan |
| `--card` | Card backgrounds | Slightly lighter than bg |
| `--border` | Borders | Warm transparency (use `/50` opacity) |

### Daemon Accent (Brand Color)

The "daemon" color is a warm amber/ochre used for:
- Primary action buttons
- Active navigation states
- AI-related UI elements
- Accent highlights

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--daemon` | Soft amber | Warm gold |
| `--daemon-foreground` | Light cream (for button text) | Light cream |
| `--daemon-muted` | Very light amber | Muted amber |

```css
/* Primary buttons */
className="bg-daemon hover:bg-daemon/90 text-daemon-foreground"

/* Active nav items */
className="bg-daemon/10 text-daemon"

/* Accent backgrounds */
className="bg-daemon-muted"
```

---

## Components

### Buttons

Use shadcn `Button` component. Primary actions use daemon accent:

```tsx
<Button className="bg-daemon hover:bg-daemon/90 text-daemon-foreground">
  Primary Action
</Button>

<Button variant="ghost">Secondary Action</Button>
<Button variant="link">Text Link</Button>
```

### Cards

Use shadcn `Card` with subtle borders:

```tsx
<Card className="border-border/50 hover:border-daemon/40">
  <CardContent className="px-5 py-3">
    {/* Compact padding for list items */}
  </CardContent>
</Card>
```

### Forms

- Use shadcn `Input`, `Label`, `Alert` components
- Focus rings use daemon color: `focus-visible:ring-daemon`
- For inline/seamless inputs (like document titles), use raw `<input>` with transparent styling

### Dialogs

Use shadcn `AlertDialog` for confirmations:

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Action</AlertDialogTitle>
      <AlertDialogDescription>Description here</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive">Confirm</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Badges

Use for status indicators like "Soon":

```tsx
<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
  Soon
</Badge>
```

### Loading States

Use shadcn `Spinner` component with daemon color:

```tsx
<Spinner className="w-6 h-6 text-daemon" />
```

---

## Layout

### Container

Use the `.container` class for consistent horizontal padding:

```tsx
<div className="container">
  {/* Content with responsive horizontal padding */}
</div>
```

Container applies: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`

### Header

- Sticky with backdrop blur
- Height: `h-14`
- Border bottom in light mode, subtle in dark

### Page Structure

```tsx
<div className="flex-1 bg-background">
  {/* Page header - no border */}
  <div className="bg-background/50">
    <div className="container py-6">
      {/* Title + actions */}
    </div>
  </div>

  {/* Content */}
  <div className="container py-8">
    {/* Page content */}
  </div>
</div>
```

---

## Editor (Tiptap)

The editor uses its own styling system but integrates with the theme:

- Toolbar: Transparent background, blends with page
- Toolbar padding matches container padding at breakpoints
- Typography uses Crimson Pro for body, Cormorant Garamond for headings
- Cursor color uses daemon accent

---

## Icons

Use [Lucide React](https://lucide.dev/) icons consistently:

```tsx
import { Lightbulb, PenLine, Trash2, Plus } from "lucide-react"

// Standard size
<Icon className="w-4 h-4" />

// Large (empty states)
<Icon className="w-10 h-10" />
```

Key icons:
- `Lightbulb` - Daimon logo/brand
- `PenLine` - Writing
- `BookOpen` - Sources
- `Sparkles` - Prompts/AI
- `Trash2` - Delete
- `Plus` - Create new

---

## Accessibility

- All interactive elements have visible focus states
- Color contrast meets WCAG AA standards
- Dark mode supported via `next-themes`
- Prefer semantic HTML elements
