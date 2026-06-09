import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { BASE_URL } from "../config";   // ✅ IMPORTANT

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const url = BASE_URL;   // ✅ FIXED
  const [token, setToken] = useState("");
  const [food_list, setFoodList] = useState([]);

  // ADD TO CART
  const addToCart = async (itemId) => {
    if (!cartItems[itemId]) {
      setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }

    if (token) {
      const response = await axios.post(
        url + "/api/cart/add",
        { itemId },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success("Item added to cart");
      } else {
        toast.error("Something went wrong");
      }
    }
  };

  // REMOVE FROM CART
  const removeFromCart = async (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));

    if (token) {
      const response = await axios.post(
        url + "/api/cart/remove",
        { itemId },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success("Item removed");
      } else {
        toast.error("Error removing item");
      }
    }
  };

  // TOTAL
  const getTotalCartAmount = () => {
    let totalAmount = 0;

    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInfo = food_list.find((p) => p._id === item);
        totalAmount += itemInfo.price * cartItems[item];
      }
    }

    return totalAmount;
  };

  // FETCH FOOD
  const fetchFoodList = async () => {
    try {
      const response = await axios.get(url + "/api/food/list");

      if (response.data.success) {
        setFoodList(response.data.data);
      } else {
        toast.error("Failed to fetch food");
      }
    } catch (err) {
      console.log(err);
    }
  };

  // LOAD CART
  const loadCartData = async (token) => {
    try {
      const response = await axios.post(
        url + "/api/cart/get",
        {},
        { headers: { token } }
      );

      setCartItems(response.data.cartData);
    } catch (err) {
      console.log(err);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    async function loadData() {
      await fetchFoodList();

      if (localStorage.getItem("token")) {
        setToken(localStorage.getItem("token"));
        await loadCartData(localStorage.getItem("token"));
      }
    }

    loadData();
  }, []);

  const contextValue = {
    food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    url,
    token,
    setToken,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;