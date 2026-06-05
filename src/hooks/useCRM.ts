"use client";

import { useState, useEffect } from "react";
import { crmService, Customer, CustomerContact, CustomerAddress, CustomerDiscount, CustomerActivity, CustomerSegment } from "@/services/crmService";
import { supabase } from "@/lib/supabase";
import { QuoteRequest } from "@/types";

export function useCRM() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [custs, segs] = await Promise.all([
        crmService.getCustomers(),
        crmService.getSegments()
      ]);
      setCustomers(custs);
      setSegments(segs);
    } catch (e) {
      console.error("Error loading CRM initial data:", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const refreshCustomers = async () => {
    try {
      const custs = await crmService.getCustomers();
      setCustomers(custs);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshSegments = async () => {
    try {
      const segs = await crmService.getSegments();
      setSegments(segs);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Customer CRUD ---
  const addCustomer = async (
    customer: Omit<Customer, "id" | "created_at" | "updated_at">,
    contacts: Omit<CustomerContact, "id" | "customer_id" | "created_at">[],
    addresses: Omit<CustomerAddress, "id" | "customer_id" | "created_at">[],
    discounts: Omit<CustomerDiscount, "id" | "customer_id" | "created_at">[]
  ) => {
    try {
      const newCust = await crmService.createCustomer(customer, contacts, addresses, discounts);
      await refreshCustomers();
      return newCust;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    try {
      const updated = await crmService.updateCustomer(id, customer);
      await refreshCustomers();
      return updated;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await crmService.deleteCustomer(id);
      await refreshCustomers();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // --- Sub-Entities Operations ---
  const addContact = async (contact: CustomerContact) => {
    const data = await crmService.addCustomerContact(contact);
    return data;
  };

  const updateContact = async (id: string, contact: Partial<CustomerContact>) => {
    const data = await crmService.updateCustomerContact(id, contact);
    return data;
  };

  const deleteContact = async (id: string) => {
    await crmService.deleteCustomerContact(id);
  };

  const addAddress = async (address: CustomerAddress) => {
    const data = await crmService.addCustomerAddress(address);
    return data;
  };

  const updateAddress = async (id: string, address: Partial<CustomerAddress>) => {
    const data = await crmService.updateCustomerAddress(id, address);
    return data;
  };

  const deleteAddress = async (id: string) => {
    await crmService.deleteCustomerAddress(id);
  };

  const addDiscount = async (discount: CustomerDiscount) => {
    const data = await crmService.addCustomerDiscount(discount);
    return data;
  };

  const updateDiscount = async (id: string, discount: Partial<CustomerDiscount>) => {
    const data = await crmService.updateCustomerDiscount(id, discount);
    return data;
  };

  const deleteDiscount = async (id: string) => {
    await crmService.deleteCustomerDiscount(id);
  };

  const addActivity = async (activity: Omit<CustomerActivity, 'id' | 'created_at'>) => {
    const data = await crmService.logCustomerActivity(activity);
    return data;
  };

  // --- Segments Operations ---
  const addSegment = async (segment: Omit<CustomerSegment, 'id' | 'created_at'>) => {
    const data = await crmService.createSegment(segment);
    await refreshSegments();
    return data;
  };

  const updateSegment = async (id: string, segment: Partial<CustomerSegment>) => {
    const data = await crmService.updateSegment(id, segment);
    await refreshSegments();
    return data;
  };

  const deleteSegment = async (id: string) => {
    await crmService.deleteSegment(id);
    await refreshSegments();
  };

  // --- Fetch Detailed Customer Profile ---
  const getCustomerProfile = async (id: string) => {
    try {
      const details = await crmService.getCustomerById(id);
      
      // Load historical quotes from standard quotes table
      const { data: quotesData, error: qErr } = await supabase
        .from("quotes")
        .select("*")
        .order("date", { ascending: false });

      let customerQuotes: QuoteRequest[] = [];
      let customerOrders: QuoteRequest[] = [];

      if (!qErr && quotesData) {
        // Filter quotes where client.customerId matches id OR client.email matches the primary contact's email
        const primaryContactEmail = details.contacts.find(c => c.is_primary)?.email?.toLowerCase();
        
        const allClientQuotes = (quotesData as QuoteRequest[]).filter(q => {
          const qCustId = (q.client as any).customerId;
          if (qCustId === id) return true;
          if (primaryContactEmail && q.client.email?.toLowerCase() === primaryContactEmail) return true;
          return false;
        });

        customerQuotes = allClientQuotes.filter(q => q.status !== "completed");
        customerOrders = allClientQuotes.filter(q => q.status === "completed");
      }

      return {
        ...details,
        quotes: customerQuotes,
        orders: customerOrders
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // --- Segment Members Evaluation (Client-Side) ---
  const evaluateSegmentMembers = async (
    rules: CustomerSegment["rules_json"],
    allContacts: CustomerContact[],
    allAddresses: CustomerAddress[],
    allQuotes: QuoteRequest[]
  ): Promise<Customer[]> => {
    return customers.filter(customer => {
      // Rule 1: accepts_marketing check
      if (!customer.accepts_marketing) return false;

      // Rules mapping check
      if (rules.customer_type && customer.customer_type !== rules.customer_type) return false;
      if (rules.price_level && customer.price_level !== rules.price_level) return false;

      const clientAddresses = allAddresses.filter(a => a.customer_id === customer.id);
      const defaultAddress = clientAddresses.find(a => a.is_default) || clientAddresses[0];

      if (rules.city && defaultAddress?.city?.toLowerCase() !== rules.city.toLowerCase()) return false;
      if (rules.state && defaultAddress?.state?.toLowerCase() !== rules.state.toLowerCase()) return false;
      if (rules.postal_code && defaultAddress?.postal_code !== rules.postal_code) return false;

      // Quote historical details mapping
      const clientQuotes = allQuotes.filter(q => {
        const qCustId = (q.client as any).customerId;
        return qCustId === customer.id;
      });

      if (rules.min_purchases) {
        const completedTotal = clientQuotes
          .filter(q => q.status === "completed")
          .reduce((sum, q) => sum + q.total, 0);
        if (completedTotal < rules.min_purchases) return false;
      }

      if (rules.interest_category) {
        const hasInterest = clientQuotes.some(q => 
          q.items.some(item => item.printOption.toLowerCase().includes(rules.interest_category!.toLowerCase()) || 
                              item.productName.toLowerCase().includes(rules.interest_category!.toLowerCase()))
        );
        if (!hasInterest) return false;
      }

      return true;
    });
  };

  return {
    customers,
    segments,
    isLoaded,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addContact,
    updateContact,
    deleteContact,
    addAddress,
    updateAddress,
    deleteAddress,
    addDiscount,
    updateDiscount,
    deleteDiscount,
    addActivity,
    getCustomerProfile,
    addSegment,
    updateSegment,
    deleteSegment,
    evaluateSegmentMembers,
    refreshCustomers
  };
}
