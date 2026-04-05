"use client";
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginPage from './app/routes/login';
import '@testing-library/jest-dom';

// Mock the dependencies
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => jest.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

jest.mock("~/lib/auth.client", () => ({
  authClient: {
    signIn: {
      email: jest.fn(),
      social: jest.fn(),
    },
  },
}));

jest.mock("~/lib/auth.server", () => ({
  getOptionalSession: jest.fn(() => Promise.resolve(null)),
}));

describe('Login Page Loading States', () => {
  it('should show loading skeleton when loading is true', () => {
    // Mock loading state
    const MockLoginPage = () => {
      const [loading, setLoading] = React.useState(true);
      return (
        <div>
          <LoginPage loading={loading} setLoading={() => {}} />
        </div>
      );
    };
    
    render(<MockLoginPage />);
    
    // Check for skeleton elements
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });
  
  it('should show redirecting state when redirecting is true', () => {
    // Mock redirecting state
    const MockLoginPage = () => {
      const [loading, setLoading] = React.useState(false);
      const [redirecting, setRedirecting] = React.useState(true);
      return (
        <div>
          <LoginPage loading={loading} setLoading={() => {}} redirecting={redirecting} setRedirecting={() => {}} />
        </div>
      );
    };
    
    render(<MockLoginPage />);
    
    // Check for redirecting UI
    expect(screen.getByText('Redirecting to dashboard...')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});

// Add proper type definitions for our test
declare module './app/routes/login' {
  interface LoginPageProps {
    loading?: boolean;
    setLoading?: (loading: boolean) => void;
    redirecting?: boolean;
    setRedirecting?: (redirecting: boolean) => void;
  }
  const LoginPage: React.FC<LoginPageProps>;
  export default LoginPage;
}