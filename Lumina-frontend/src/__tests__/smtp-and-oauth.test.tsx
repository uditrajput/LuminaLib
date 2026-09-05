import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import AppConfigPage from '@/app/admin/config/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useAuth');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/components/layout/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockConfigs = [
  { id: 1, key: 'smtp_enabled', value: 'true', description: 'Enable SMTP' },
  { id: 2, key: 'smtp_host', value: 'smtp.gmail.com', description: 'SMTP Host' },
  { id: 3, key: 'smtp_port', value: '587', description: 'SMTP Port' },
  { id: 4, key: 'smtp_user', value: 'noreply@luminalib.com', description: 'Sender User' },
  { id: 5, key: 'allowed_email_domains', value: '@gmail.com, @hotmail.com', description: 'Allowed Domains' },
  { id: 6, key: 'google_oauth_enabled', value: 'true', description: 'Google Auth' },
  { id: 7, key: 'google_client_id', value: 'google-client-123', description: 'Google Client ID' },
  { id: 8, key: 'microsoft_oauth_enabled', value: 'true', description: 'Microsoft Auth' },
  { id: 9, key: 'facebook_oauth_enabled', value: 'true', description: 'Facebook Auth' },
];

jest.mock('@/hooks/useAppConfigs', () => ({
  useAppConfigs: () => ({
    data: mockConfigs,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateAppConfig: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
  }),
  useCreateAppConfig: () => ({
    mutate: jest.fn(),
  }),
}));

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/auth/social-status') {
        return Promise.resolve({ data: { google: true, microsoft: true, facebook: true } });
      }
      return Promise.resolve({ data: {} });
    }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('@/services/voiceService', () => ({
  __esModule: true,
  default: {
    getVoices: jest.fn().mockResolvedValue([]),
    getPreferences: jest.fn().mockResolvedValue({}),
  },
}));


describe('Social Media Sign-In OAuth Buttons', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('renders Google, Microsoft, and Facebook social login buttons on LoginPage', async () => {
    render(<LoginPage />);

    expect(await screen.findByText('Google')).toBeInTheDocument();
    expect(await screen.findByText('Microsoft')).toBeInTheDocument();
    expect(await screen.findByText('Facebook')).toBeInTheDocument();
  });

  it('renders individual Edit buttons on each OAuth provider row in AppConfigPage', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, email: 'admin@luminalib.com', role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AppConfigPage />
      </QueryClientProvider>
    );

    // Expand Social OAuth panel
    const oauthPanelHeader = screen.getByText('Social Authentication (OAuth 2.0)');
    fireEvent.click(oauthPanelHeader);

    // Verify individual provider rows are present with their own Edit buttons
    expect(screen.getByText('Gmail / Google Single Sign-On')).toBeInTheDocument();
    expect(screen.getByText('Microsoft / Hotmail / Outlook SSO')).toBeInTheDocument();
    expect(screen.getByText('Facebook Login')).toBeInTheDocument();

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(3);

    // Click Edit on Google row
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('Save Google Settings')).toBeInTheDocument();
  });
});


