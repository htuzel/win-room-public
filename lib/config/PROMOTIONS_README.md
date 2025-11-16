# 📢 Promotion Banner Usage Guide

You can easily change the promotion banner from the `lib/config/promotions.ts` file.

## 🚀 Quick Start

1. Open `lib/config/promotions.ts` file
2. Edit the `currentPromotion` object
3. Save - page auto-refreshes!

## 📝 Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `title` | string | Title (appears in uppercase) | `"Black Friday! 🔥"` |
| `message` | string | Message text | `"Show time! Make quick decisions."` |
| `variant` | select | Color theme | `"promo"` / `"info"` / `"success"` / `"warning"` |
| `icon` | emoji | Emoji icon | `"🎯"` / `"🔥"` / `"✨"` / `"🏆"` |
| `visible` | boolean | Show/hide | `true` / `false` |

## 🎨 Color Themes (Variants)

### `promo` - Purple/Pink
For campaigns, special days, promotions.
```ts
variant: 'promo'
```

### `success` - Green
For achievements, goal approaches, positive news.
```ts
variant: 'success'
```

### `info` - Blue
For announcements, new features, updates.
```ts
variant: 'info'
```

### `warning` - Orange/Yellow
For attention-grabbing announcements, maintenance notifications.
```ts
variant: 'warning'
```

## 📚 Ready-to-Use Examples

### Black Friday
```ts
{
  title: 'Black Friday Started! 🔥',
  message: 'Show time! Special discounts today.',
  variant: 'promo',
  icon: '🎯',
  visible: true,
}
```

### Goal Approaching
```ts
{
  title: 'Goal Approaching! 🏆',
  message: 'Only $5K left to team goal!',
  variant: 'success',
  icon: '🚀',
  visible: true,
}
```

### New Feature
```ts
{
  title: 'New Feature ✨',
  message: 'Installment system is now active!',
  variant: 'info',
  icon: '🆕',
  visible: true,
}
```

### System Maintenance
```ts
{
  title: 'Attention! ⚠️',
  message: 'Maintenance at 6:00 PM.',
  variant: 'warning',
  icon: '🔧',
  visible: true,
}
```

## 🎯 Popular Emojis

Campaign/Promo:
- 🔥 Fire
- 🎯 Target
- 💰 Money
- 🎉 Party
- 🎁 Gift
- ⚡ Lightning
- 🚀 Rocket

Success/Goal:
- 🏆 Trophy
- ⭐ Star
- 💪 Power
- 👑 Crown
- 🥇 Medal

Info/Announcement:
- ✨ Sparkles
- 🆕 New
- 📢 Megaphone
- 💡 Bulb
- 📣 Announcement

Warning/Alert:
- ⚠️ Warning
- 🔧 Maintenance
- ⏰ Clock
- 🛠️ Tools

## 🎬 Hiding the Banner

To completely hide the banner:
```ts
visible: false
```

## 💡 Tips

1. **Use short and concise messages** - long texts don't get read
2. **Use emoji in title** too (e.g., "Black Friday! 🔥")
3. **Choose variant based on message** (campaign = promo, success = success, etc.)
4. **Test it** - try different variants and pick the best one

## 🔄 Change Examples

### Example 1: Black Friday → New Year
```diff
- title: 'Black Friday Started! 🔥',
+ title: 'New Year Campaign 🎄',
- message: 'Show time! Special discounts today.',
+ message: 'Special offers for the new year!',
  variant: 'promo',
- icon: '🎯',
+ icon: '🎅',
  visible: true,
```

### Example 2: Temporarily hide banner
```diff
  title: 'Black Friday Started! 🔥',
  message: 'Show time!',
  variant: 'promo',
  icon: '🎯',
- visible: true,
+ visible: false,
```

---

**File Location:** `/lib/config/promotions.ts`
