export const theme = {
    colors: {
        background: {
            main: '#efe9da',
            surface: '#f6f1e6',
            elevated: '#ffffff',
        },
        text: {
            primary: '#2d2a23',
            secondary: '#6f6757',
            muted: '#8a8374',
            terminal: '#1f6d5a',
            accent: '#b07b2c',
        },
        border: {
            subtle: 'rgba(45, 42, 35, 0.18)',
            bold: 'rgba(45, 42, 35, 0.3)',
            active: '#1f6d5a',
        },
        status: {
            success: '#1f6d5a',
            warning: '#b07b2c',
            error: '#b91c1c',
            info: '#2563eb',
        }
    },
    borderRadius: {
        none: '0px',
        sm: '6px',
        md: '10px',
        lg: '14px',
    },
    spacing: {
        layout: {
            sidebarWidth: '64px', // Collapsed state
            headerHeight: '60px',
        }
    },
    fonts: {
        ui: '"EB Garamond", serif',
        code: '"IBM Plex Mono", monospace',
    }
} as const;

export type Theme = typeof theme;
