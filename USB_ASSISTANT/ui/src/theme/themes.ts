export type ThemeType = 'heritage';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
}

export const themes: Record<ThemeType, ThemeColors> = {
  heritage: {
    primary: '#1f6d5a',
    secondary: '#b07b2c',
    accent: '#e11d48',
    background: '#efe9da',
    surface: '#e7e0cf',
    border: 'rgba(45, 42, 35, 0.18)',
    text: '#2d2a23',
    textMuted: '#6f6757',
  },
};
