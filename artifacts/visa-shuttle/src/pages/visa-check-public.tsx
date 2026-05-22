import { useEffect } from "react";
import { useLocation } from "wouter";

export default function VisaCheckPublicPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/sign-in?next=${encodeURIComponent("/visa-tools/visa-check")}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
  }, [setLocation]);
  return null;
}
