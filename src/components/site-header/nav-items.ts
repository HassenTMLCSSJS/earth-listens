import type { NavHref } from '@/core/actions';

export type NavIcon =
  'home' | 'compass' | 'book' | 'wave' | 'quiz' | 'symphony' | 'database' | 'info';

export interface NavItem {
  href: NavHref;
  /** Message key, resolved with `useTranslations()` in the UI. */
  label: string;
  /** Optional one-line description used by the Learn menu. */
  body?: string;
  icon?: NavIcon;
}

export interface LinkItem {
  href: string;
  label: string;
  /** Set for links that leave the app. */
  external?: boolean;
}

/** Explore · Learn · Symphony · Data · About, in reading order. */
export const PRIMARY_NAV: readonly NavItem[] = [{ href: '/listen', label: 'nav.listen' }] as const;

/** The four items under Learn. */
export const LEARN_NAV: readonly NavItem[] = [
  { href: '/tutorial', label: 'nav.tutorial', body: 'nav.tutorialBody', icon: 'book' },
  { href: '/how-it-sounds', label: 'nav.sounds', body: 'nav.soundsBody', icon: 'wave' },
  { href: '/quiz', label: 'nav.quiz', body: 'nav.quizBody', icon: 'quiz' },
  { href: '/guide', label: 'nav.guide', body: 'nav.guideBody', icon: 'info' },
] as const;

export const PRIMARY_TAIL: readonly NavItem[] = [
  { href: '/symphony', label: 'nav.symphony' },
  { href: '/data', label: 'nav.data' },
  { href: '/about', label: 'nav.about' },
] as const;

/** The numbered full-screen menu, 01–08. */
export const MOBILE_NAV: readonly NavItem[] = [
  { href: '/', label: 'nav.home' },
  { href: '/listen', label: 'nav.listen' },
  { href: '/tutorial', label: 'nav.tutorial' },
  { href: '/how-it-sounds', label: 'nav.sounds' },
  { href: '/quiz', label: 'nav.quiz' },
  { href: '/symphony', label: 'nav.symphony' },
  { href: '/data', label: 'nav.data' },
  { href: '/about', label: 'nav.about' },
] as const;

export interface FooterColumn {
  title: string;
  items: readonly LinkItem[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'footer.explore',
    items: [
      { href: '/listen', label: 'nav.listen' },
      { href: '/symphony', label: 'nav.symphony' },
      { href: '/data', label: 'nav.data' },
    ],
  },
  {
    title: 'footer.learn',
    items: [
      { href: '/tutorial', label: 'nav.tutorial' },
      { href: '/how-it-sounds', label: 'nav.sounds' },
      { href: '/quiz', label: 'nav.quiz' },
      { href: '/guide', label: 'nav.guide' },
    ],
  },
  {
    title: 'footer.project',
    items: [
      { href: '/about', label: 'nav.about' },
      { href: '/about#team', label: 'about.teamTitle' },
      {
        href: 'https://github.com/HassenTMLCSSJS/earth-listens',
        label: 'footer.github',
        external: true,
      },
    ],
  },
  {
    title: 'footer.access',
    items: [
      { href: '/about#a11y', label: 'footer.accessStatement' },
      { href: '/guide', label: 'footer.shortcuts' },
      { href: '/settings', label: 'nav.settings' },
    ],
  },
] as const;

/** Hrefs that belong to the Learn group and light it up in the header. */
export const LEARN_HREFS: readonly NavHref[] = LEARN_NAV.map((item) => item.href);

export function isLearnRoute(pathname: string): boolean {
  return LEARN_HREFS.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

/** Everything the header, the mobile sheet and the footer can link to. */
export const NAV_ITEMS = {
  primary: PRIMARY_NAV,
  learn: LEARN_NAV,
  tail: PRIMARY_TAIL,
  mobile: MOBILE_NAV,
  footer: FOOTER_COLUMNS,
} as const;
