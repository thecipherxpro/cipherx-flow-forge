import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, LogIn } from "lucide-react";
import cipherxLogo from "@/assets/cipherx-logo.png";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, isLoading } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleNavigate = () => {
    if (user && userRole) {
      // Redirect to appropriate dashboard based on role
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'staff') {
        navigate('/staff');
      } else if (userRole === 'client') {
        navigate('/portal');
      }
    } else {
      navigate('/auth');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <img src={cipherxLogo} alt="CipherX Logo" className="h-12 w-12 object-contain" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <img src={cipherxLogo} alt="CipherX Logo" className="h-16 w-16 object-contain mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button onClick={handleNavigate} size="lg" className="gap-2">
          {user && userRole ? (
            <>
              <Home className="h-4 w-4" />
              Back to Dashboard
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Go to Login
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
