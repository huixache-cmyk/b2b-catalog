"use client";

import { useState, useEffect } from "react";
import { CartItem } from "@/types";

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("geekystore_cart");
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing cart", e);
      }
    }
    setIsLoaded(true);

    // Listen for custom event to sync across components in the same window
    const handleCartUpdate = () => {
      const updated = localStorage.getItem("geekystore_cart");
      if (updated) {
        setCartItems(JSON.parse(updated));
      } else {
        setCartItems([]);
      }
    };

    window.addEventListener("cart_updated", handleCartUpdate);
    return () => window.removeEventListener("cart_updated", handleCartUpdate);
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem("geekystore_cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cart_updated"));
  };

  const addToCart = (item: CartItem) => {
    // Check if identical item (same product, color, print option) exists
    const existingIndex = cartItems.findIndex(
      (i) => i.productId === item.productId && i.color === item.color && i.printOption === item.printOption
    );

    let newCart = [...cartItems];
    if (existingIndex >= 0) {
      newCart[existingIndex].quantity += item.quantity;
      newCart[existingIndex].totalPrice = newCart[existingIndex].quantity * newCart[existingIndex].unitPrice;
    } else {
      newCart.push(item);
    }
    saveCart(newCart);
  };

  const removeFromCart = (id: string) => {
    saveCart(cartItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice
        };
      }
      return item;
    });
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    cartItems,
    isLoaded,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
  };
}
