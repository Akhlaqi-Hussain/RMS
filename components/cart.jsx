"use client";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaTimes,
  FaTrash,
  FaPlus,
  FaMinus,
  FaShoppingBag,
  FaShoppingCart,
} from "react-icons/fa";

const Cart = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();

  // Calculate total price
  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const handleCheckout = () => {
    onClose();
    router.push("/main/checkout");
  };

  // Animation variants
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const cartVariants = {
    hidden: { x: "-100%" },
    visible: {
      x: 0,
      transition: { type: "spring", damping: 25, stiffness: 120 },
    },
    exit: { x: "-100%", transition: { duration: 0.3 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: 50, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          {/* Cart Drawer on the left */}
          <motion.div
            className="fixed left-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
            variants={cartVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <div className="flex items-center">
                <h2 className="text-xl font-bold text-[color:var(--color-text-primary)]">
                  سبد خرید
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                aria-label="بستن سبد خرید"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <FaShoppingBag className="text-gray-300 text-5xl mb-4" />
                  <p className="text-lg mb-2">سبد خرید شما خالی است</p>
                  <p className="text-sm text-gray-400 text-center">
                    محصولات مورد علاقه خود را به سبد خرید اضافه کنید
                  </p>
                </motion.div>
              ) : (
                <motion.ul className="space-y-4">
                  <AnimatePresence>
                    {cartItems.map((item) => (
                      <motion.li
                        key={item.id}
                        className="flex items-center bg-white rounded-lg border border-gray-100 p-3 shadow-sm"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[color:var(--color-text-primary)] truncate">
                            {item.name}
                          </h3>
                          <p className="text-[color:var(--color-primary)] font-medium text-sm mt-1">
                            {item.price.toLocaleString()} ؋
                          </p>

                          <div className="flex items-center gap-2 mt-3">
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="کاهش تعداد"
                            >
                              <FaMinus size={12} />
                            </motion.button>

                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-full text-gray-600"
                              aria-label="افزایش تعداد"
                            >
                              <FaPlus size={12} />
                            </motion.button>
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeFromCart(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-2 transition-colors duration-200"
                          aria-label="حذف از سبد خرید"
                        >
                          <FaTrash />
                        </motion.button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <motion.div
                className="p-5 border-t border-gray-200 bg-gray-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">جمع کل:</span>
                  <span className="text-xl font-bold text-[color:var(--color-primary)]">
                    {totalPrice.toLocaleString()} افغانی
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  className="w-full bg-[color:var(--color-primary)] text-white py-3 rounded-xl font-medium hover:bg-[color:var(--color-primary-light)] transition-colors duration-200 shadow-md"
                >
                  ادامه خرید
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Cart;
