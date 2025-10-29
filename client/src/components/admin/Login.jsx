import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import ggg from "../../assets/ggg.svg";

const Login = () => {
  const { user, loading, login } = useAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-full max-w-md bg-black p-2">
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-black relative">
              <img
                src={ggg}
                alt="Glazing Gorilla Games Logo"
                className="h-32 relative z-10"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.6)) drop-shadow(0 0 60px rgba(255,255,255,0.4))',
                  transform: 'translateZ(0)',
                  willChange: 'auto'
                }}
              />
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 w-64 h-64 bg-white/15 rounded-full blur-[60px] -z-10"
                style={{ transform: 'translate(-50%, -50%) translateZ(0)', willChange: 'auto' }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              {/* <Label htmlFor="username" className="text-white">
                User
              </Label> */}
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-black ring-neutral-900 border-neutral-900 text-white placeholder:text-white/50"
              />
            </div>
            <div className="space-y-2">
              {/* <Label htmlFor="password" className="text-white">
                Password
              </Label> */}
              <Input
                id="password"
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-black text-white ring-neutral-900 border-neutral-900  placeholder:text-white/50"
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-red-500 bg-black">{error}</div>
            )}
            <Button
              type="submit"
              className="w-full rounded-md border border-neutral-900 bg-neutral-950 text-white "
              disabled={isSubmitting}
            >
              {isSubmitting ? "logging in..." : "login"}
            </Button>
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default Login;
