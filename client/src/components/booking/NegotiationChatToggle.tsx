/**
 * NegotiationChatToggle — a global floating toggle button + chat popup manager.
 *
 * Renders a small circular FAB (floating action button) at the bottom-right corner
 * of the screen. Clicking it toggles the NegotiationChat popup open/closed.
 * The chat state persists across route changes since this component lives in App.
 *
 * Usage in App.tsx:
 *   <NegotiationChatProvider>
 *     ... routes ...
 *   </NegotiationChatProvider>
 *
 * From any page:
 *   const { openChat, closeChat, isOpen } = useNegotiationChatContext();
 *   openChat(booking);                    // open for negotiation
 *   openChat(booking, { contract: true }); // open with contract summary
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { NegotiationChat } from "./NegotiationChat";
import { ContractModule } from "./ContractModule";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ChatOptions {
  contract?: boolean; // open contract module immediately
}

interface NegotiationChatContextValue {
  /** The currently active booking in the chat, or null */
  activeBooking: any | null;
  /** Whether the chat popup is visible */
  isOpen: boolean;
  /** Whether the contract overlay is visible */
  isContractOpen: boolean;
  /** Open the chat for a booking. Pass { contract: true } to also open contract. */
  openChat: (booking: any, options?: ChatOptions) => void;
  /** Close the chat popup (minimize — booking stays active) */
  closeChat: () => void;
  /** Toggle visibility */
  toggleChat: () => void;
  /** Fully dismiss — clear the active booking */
  dismissChat: () => void;
  /** Open the contract module overlay */
  openContract: () => void;
  /** Close the contract module overlay */
  closeContract: () => void;
}

const NegotiationChatContext = createContext<NegotiationChatContextValue | null>(
  null,
);

export function useNegotiationChatContext() {
  const ctx = useContext(NegotiationChatContext);
  if (!ctx)
    throw new Error(
      "useNegotiationChatContext must be used within NegotiationChatProvider",
    );
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NegotiationChatProvider({ children }: { children: ReactNode }) {
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isContractOpen, setIsContractOpen] = useState(false);

  const openChat = useCallback(
    (booking: any, options?: ChatOptions) => {
      setActiveBooking(booking);
      setIsOpen(true);
      if (options?.contract) {
        setIsContractOpen(true);
      }
    },
    [],
  );

  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((v) => !v), []);
  const dismissChat = useCallback(() => {
    setIsOpen(false);
    setIsContractOpen(false);
    setActiveBooking(null);
  }, []);
  const openContract = useCallback(() => setIsContractOpen(true), []);
  const closeContract = useCallback(() => setIsContractOpen(false), []);

  const ctxValue: NegotiationChatContextValue = {
    activeBooking,
    isOpen,
    isContractOpen,
    openChat,
    closeChat,
    toggleChat,
    dismissChat,
    openContract,
    closeContract,
  };

  return (
    <NegotiationChatContext.Provider value={ctxValue}>
      {children}
      {/* Portal-rendered toggle button + chat popup */}
      {typeof document !== "undefined" &&
        createPortal(<ChatPortalUI />, document.body)}
    </NegotiationChatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Portal UI — FAB + chat popup + contract overlay
// ---------------------------------------------------------------------------

function ChatPortalUI() {
  const {
    activeBooking,
    isOpen,
    isContractOpen,
    toggleChat,
    dismissChat,
    openContract,
    closeContract,
  } = useNegotiationChatContext();

  // Nothing to render if no booking is active
  if (!activeBooking) return null;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 400 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-[9990] w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer group"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #49AAFF 0%, #188BEF 100%)",
              boxShadow:
                "0 4px 20px rgba(24, 139, 239, 0.5), 0 0 40px rgba(24, 139, 239, 0.15)",
            }}
            aria-label="Open negotiation chat"
          >
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {/* Unread dot */}
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#188BEF]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Popup ── */}
      <AnimatePresence>
        {isOpen && (
          <NegotiationChat
            booking={activeBooking}
            onClose={toggleChat}
            onOpenContract={openContract}
            onDismiss={dismissChat}
          />
        )}
      </AnimatePresence>

      {/* ── Contract Module overlay ── */}
      {isContractOpen && (
        <ContractModule
          bookingId={activeBooking.id}
          onClose={closeContract}
        />
      )}
    </>
  );
}
