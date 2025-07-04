import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/src/lib/supabase";
import React from "react";
import { Session } from "@supabase/supabase-js";
import { Admin, Customer } from "@/assets/data/types";
import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";

interface AuthData {
  session: Session | null;
  loading: boolean;
  user: Customer | Admin | null;
  isAdmin: boolean;
  isMockEnabled?: boolean;
  isBiometricAuthenticated: boolean;
  authenticateBiometric: () => Promise<boolean>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthData>({
  session: null,
  loading: true,
  user: null,
  isAdmin: false,
  isMockEnabled: false,
  isBiometricAuthenticated: false,
  authenticateBiometric: () => Promise.resolve(false),
  logOut: () => Promise.resolve(),
});

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Customer | Admin | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMockEnabled, setIsMockEnabled] = useState(false);
  const [isBiometricAuthenticated, setIsBiometricAuthenticated] =
    useState(false);

  const authenticateBiometric = async () => {
    if (Platform.OS === "android") {
      console.log("Skipping biometric authentication for Android emulator.");
      setIsBiometricAuthenticated(true); // change this if using non-emulator Android device
      return true;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Authentication Error",
          "Biometric authentication is not available on this device."
        );
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to continue",
        fallbackLabel: "Enter PIN",
      });

      if (result.success) {
        setIsBiometricAuthenticated(true);
        return true;
      } else {
        Alert.alert(
          "Authentication Error",
          "Biometric authentication failed. Please try again."
        );
        return false;
      }
    } catch (error) {
      console.error("Error during biometric authentication:", error);
      Alert.alert(
        "Authentication Error",
        "An error occurred during authentication."
      );
      return false;
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);

      if (isMockEnabled) {
        const mockSession: Session = {
          user: {
            id: "mock-user-id",
            email: "admin@ewb.com",
            app_metadata: {},
            user_metadata: {},
            aud: "",
            created_at: "",
          },
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
        };

        const mockAdmin: Admin = {
          user_uuid: "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
          username: "admin_manager",
          admin_id: "ad1d1d1d-e1e1-f1f1-a1a1-b1b1b1b1b1ad",
          role: "Manager",
          created_at: "2023-12-01T09:00:00Z",
        };

        setSession(mockSession);
        setUser(mockAdmin);
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error fetching session:", error);
          setLoading(false);
          return;
        }

        if (data.session) {
          const [customerData, adminData] = await Promise.all([
            supabase
              .from("Customer")
              .select("*")
              .eq("user_uuid", data.session.user.id)
              .single(),
            supabase
              .from("Admin")
              .select("*")
              .eq("user_uuid", data.session.user.id)
              .single(),
          ]);

          if (customerData.data) {
            setUser(customerData.data);
            setIsAdmin(false);
          } else if (adminData.data) {
            setUser(adminData.data);
            setIsAdmin(true);
          }

          setSession(data.session);
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error in fetchSession:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession().then(() => {
      if (!session) {
        router.push("/(auth)/home-page")
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoading(true);
        fetchSession();
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const logOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setIsBiometricAuthenticated(false); // Reset biometric authentication state
      router.push("/(auth)/home-page");
    } catch (error) {
      console.error("Error during logout:", error);
      Alert.alert("Logout Error", "An error occurred while logging out.");
    }
  }

  const contextValue = React.useMemo(
    () => ({
      session,
      loading,
      user,
      isAdmin,
      isMockEnabled,
      isBiometricAuthenticated,
      authenticateBiometric,
      logOut,
    }),
    [
      session,
      loading,
      user,
      isAdmin,
      isMockEnabled,
      isBiometricAuthenticated,
      authenticateBiometric,
      logOut,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
