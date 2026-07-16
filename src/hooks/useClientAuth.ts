"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Customer, CustomerContact, CustomerAddress, CustomerDiscount } from "@/services/crmService";

export interface B2BClientSession {
  customer: Customer;
  contact: CustomerContact;
  addresses: CustomerAddress[];
  discounts: CustomerDiscount[];
}

export function useClientAuth() {
  const [session, setSession] = useState<B2BClientSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSession();

    // Listen for cross-component session changes in the same window
    const handleSessionUpdate = () => {
      const saved = localStorage.getItem("geekystore_b2b_session");
      if (saved) {
        setSession(JSON.parse(saved));
      } else {
        setSession(null);
      }
    };
    window.addEventListener("b2b_session_updated", handleSessionUpdate);
    return () => window.removeEventListener("b2b_session_updated", handleSessionUpdate);
  }, []);

  const loadSession = async () => {
    try {
      const saved = localStorage.getItem("geekystore_b2b_session");
      if (saved) {
        const parsed = JSON.parse(saved) as B2BClientSession;
        // Verify session data is still fresh
        const { data: customer, error: custErr } = await supabase
          .from("customers")
          .select("*")
          .eq("id", parsed.customer.id)
          .single();

        if (!custErr && customer) {
          const [contactsRes, addressesRes, discountsRes] = await Promise.all([
            supabase.from("customer_contacts").select("*").eq("customer_id", customer.id),
            supabase.from("customer_addresses").select("*").eq("customer_id", customer.id),
            supabase.from("customer_discounts").select("*").eq("customer_id", customer.id)
          ]);

          const freshContact = contactsRes.data?.find(c => c.id === parsed.contact.id) || contactsRes.data?.[0];

          if (freshContact) {
            const freshSession = {
              customer,
              contact: freshContact,
              addresses: addressesRes.data || [],
              discounts: discountsRes.data || []
            };
            localStorage.setItem("geekystore_b2b_session", JSON.stringify(freshSession));
            setSession(freshSession);
          } else {
            // Contact removed, invalidate
            logoutClient();
          }
        } else {
          // Customer not found, invalidate
          logoutClient();
        }
      }
    } catch (e) {
      console.warn("Failed to restore B2B client session", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const loginClient = async (email: string, accessKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanKey = accessKey.trim();

      if (!cleanEmail || !cleanKey) {
        return { success: false, error: "Ingresa tu correo y clave de acceso." };
      }

      // 1. Search contact by email
      const { data: contacts, error: conErr } = await supabase
        .from("customer_contacts")
        .select("*")
        .eq("email", cleanEmail);

      if (conErr) throw conErr;
      if (!contacts || contacts.length === 0) {
        return { success: false, error: "No se encontró ningún contacto con este correo electrónico." };
      }

      // 2. We can check if any of these contacts belong to a customer with the matched access_key
      const customerIds = contacts.map(c => c.customer_id);
      const { data: customers, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds)
        .eq("access_key", cleanKey);

      if (custErr) throw custErr;
      if (!customers || customers.length === 0) {
        return { success: false, error: "La clave de acceso ingresada es incorrecta o no corresponde a este cliente." };
      }

      // Active customer and contact
      const activeCustomer = customers[0];
      const activeContact = contacts.find(c => c.customer_id === activeCustomer.id)!;

      // Sync guest coupons if present in localStorage
      if (typeof window !== "undefined") {
        try {
          const claimedStr = localStorage.getItem("geekystore_claimed_coupons");
          if (claimedStr) {
            const claimed = JSON.parse(claimedStr) as string[];
            const successfullyClaimed: string[] = [];
            for (const coupon of claimed) {
              const { data: existing } = await supabase
                .from("customer_discounts")
                .select("*")
                .eq("customer_id", activeCustomer.id)
                .eq("discount_type", "promotion")
                .eq("category_id", coupon);
                
              if (!existing || existing.length === 0) {
                try {
                  const res = await fetch("/api/claim-coupon", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      customer_id: activeCustomer.id,
                      coupon: coupon
                    })
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                      successfullyClaimed.push(coupon);
                    } else {
                      console.warn(`Server failed to claim coupon ${coupon}:`, data.error);
                    }
                  } else {
                    console.warn(`Server responded with status ${res.status} when claiming coupon ${coupon}`);
                  }
                } catch (err) {
                  console.error(`Failed to request claiming coupon ${coupon}:`, err);
                }
              } else {
                successfullyClaimed.push(coupon);
              }
            }
            if (successfullyClaimed.length > 0) {
              const remaining = claimed.filter(c => !successfullyClaimed.includes(c));
              if (remaining.length > 0) {
                localStorage.setItem("geekystore_claimed_coupons", JSON.stringify(remaining));
              } else {
                localStorage.removeItem("geekystore_claimed_coupons");
              }
            }
          }
        } catch (e) {
          console.warn("Failed to sync guest coupons on login:", e);
        }
      }

      // 3. Load addresses and active discounts
      const [addressesRes, discountsRes] = await Promise.all([
        supabase.from("customer_addresses").select("*").eq("customer_id", activeCustomer.id),
        supabase.from("customer_discounts").select("*").eq("customer_id", activeCustomer.id)
      ]);

      const clientSession: B2BClientSession = {
        customer: activeCustomer,
        contact: activeContact,
        addresses: addressesRes.data || [],
        discounts: discountsRes.data || []
      };

      localStorage.setItem("geekystore_b2b_session", JSON.stringify(clientSession));
      setSession(clientSession);
      window.dispatchEvent(new Event("b2b_session_updated"));

      // Log Login Activity
      await supabase.from("customer_activity").insert([{
        customer_id: activeCustomer.id,
        activity_type: "whatsapp",
        title: "Inicio de Sesión",
        description: `Contacto ${activeContact.name} inició sesión en el Portal B2B de GeekyStore.`,
        created_by: "Sistema"
      }]);

      return { success: true };
    } catch (err: any) {
      console.error("B2B Login Error:", err);
      return { success: false, error: err.message || "Error inesperado al iniciar sesión." };
    }
  };

  const logoutClient = () => {
    localStorage.removeItem("geekystore_b2b_session");
    setSession(null);
    window.dispatchEvent(new Event("b2b_session_updated"));
  };

  return {
    session,
    isLoaded,
    loginClient,
    logoutClient
  };
}
