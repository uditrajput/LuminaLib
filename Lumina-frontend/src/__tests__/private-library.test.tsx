import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BooksPage from '@/app/books/page';

jest.mock('next/navigation', () => ({
  usePathname: () => '/books',
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'admin@test.com', role: 'admin' },
    isAuthenticated: true,
  }),
}));


jest.mock('@/hooks/useBooks', () => ({
  useBooks: () => ({
    data: { items: [{ id: 1, title: 'Private Book', access_level: 'private' }], total: 1 },
  }),
}));

jest.mock('@/components/layout/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/books/BookList', () => ({
  BookList: ({ catalog }: { catalog: string }) => <div data-testid="book-list">Catalog Mode: {catalog}</div>,
}));

describe('Private Library Dual Tab Switcher', () => {
  it('switches between Public Library and Private Library catalogs', () => {
    render(<BooksPage />);

    expect(screen.getByText('🌐 Public Library')).toBeInTheDocument();
    expect(screen.getByText('🔒 Private Library')).toBeInTheDocument();
    expect(screen.getByTestId('book-list')).toHaveTextContent('Catalog Mode: public');

    const privateBtn = screen.getByText('🔒 Private Library');
    fireEvent.click(privateBtn);

    expect(screen.getByTestId('book-list')).toHaveTextContent('Catalog Mode: private');
  });
});
