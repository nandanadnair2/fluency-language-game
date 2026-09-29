"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Check, X, Plus, BookOpen, Heart } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "./AuthModal";

interface Friend {
  id: string;
  name: string | null;
  avatar: string | null;
  xp: number;
  level: number;
  friendSince: string;
}

interface FriendRequest {
  id: string;
  sender: {
    id: string;
    name: string | null;
    avatar: string | null;
    xp: number;
    level: number;
  };
  receiver?: {
    id: string;
    name: string | null;
    avatar: string | null;
    xp: number;
    level: number;
  };
}

export default function SocialTab() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"friends" | "decks" | "leaderboard">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [publicDecks, setPublicDecks] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadFriends();
      loadPublicDecks();
    }
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      
      if (res.ok) {
        setFriends(data.friends || []);
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
      }
    } catch (err) {
      setError("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const loadPublicDecks = async () => {
    try {
      const res = await fetch("/api/decks/list");
      const data = await res.json();
      if (res.ok) {
        setPublicDecks(data.publicDecks || []);
      }
    } catch (err) {
      console.error("Failed to load decks:", err);
    }
  };

  const sendFriendRequest = async () => {
    if (!newFriendEmail.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: newFriendEmail }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to send request");
      } else {
        setNewFriendEmail("");
        await loadFriends();
      }
    } catch (err) {
      setError("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, action: "accept" | "decline") => {
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      
      if (res.ok) {
        await loadFriends();
      }
    } catch (err) {
      console.error("Failed to respond:", err);
    }
  };

  const createDeck = async () => {
    if (!deckName.trim()) return;
    
    setCreatingDeck(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deckName,
          isPublic: true,
          language: "ja",
        }),
      });
      
      if (res.ok) {
        setDeckName("");
        await loadPublicDecks();
      }
    } catch (err) {
      console.error("Failed to create deck:", err);
    } finally {
      setCreatingDeck(false);
    }
  };

  const joinDeck = async (deckId: string) => {
    try {
      const res = await fetch("/api/decks/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId }),
      });
      
      if (res.ok) {
        await loadPublicDecks();
      }
    } catch (err) {
      console.error("Failed to join deck:", err);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-coral/20 border-t-coral rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
      <div className="text-center py-12">
        <Users size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="font-serif text-lg font-bold text-charcoal mb-2">
          Social Features
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in to connect with friends and share decks
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-6 py-3 rounded-2xl bg-coral text-white font-bold hover:bg-coral/90 transition-colors"
        >
          Sign In to Continue
        </button>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
      />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Section Tabs */}
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-2xl">
          {(["friends", "decks", "leaderboard"] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === section
                  ? "bg-white shadow-sm text-coral"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {section === "friends" && <Users size={16} className="inline mr-1" />}
              {section === "decks" && <BookOpen size={16} className="inline mr-1" />}
              {section === "leaderboard" && <Heart size={16} className="inline mr-1" />}
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        {/* Friends Section */}
        {activeSection === "friends" && (
          <div className="space-y-6">
            {/* Send Request */}
            <div className="p-4 rounded-2xl bg-card border border-border/30">
              <h3 className="font-serif font-bold text-charcoal mb-3 flex items-center gap-2">
                <UserPlus size={18} className="text-coral" />
                Add Friend
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Friend's email"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
                  onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
                />
                <button
                  onClick={sendFriendRequest}
                  disabled={loading || !newFriendEmail.trim()}
                  className="px-4 py-2.5 rounded-xl bg-coral text-white text-sm font-medium hover:bg-coral/90 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </div>

            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-card border border-border/30">
                <h3 className="font-serif font-bold text-charcoal mb-3 flex items-center gap-2">
                  <UserPlus size={18} className="text-butter" />
                  Pending Requests ({incomingRequests.length})
                </h3>
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
                          {req.sender.avatar ? (
                            <img
                              src={req.sender.avatar}
                              alt={req.sender.name || "User"}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal text-sm">
                            {req.sender.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lv.{req.sender.level} · {req.sender.xp} XP
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToRequest(req.id, "accept")}
                          className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center hover:bg-sage/30"
                        >
                          <Check size={16} weight="fill" />
                        </button>
                        <button
                          onClick={() => respondToRequest(req.id, "decline")}
                          className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30"
                        >
                          <X size={16} weight="fill" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div className="p-4 rounded-2xl bg-card border border-border/30">
                <h3 className="font-serif font-bold text-charcoal mb-3">
                  Sent Requests ({outgoingRequests.length})
                </h3>
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-butter/20 flex items-center justify-center">
                          {req.receiver?.avatar ? (
                            <img
                              src={req.receiver.avatar}
                              alt={req.receiver.name || "User"}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-charcoal text-sm">
                            {req.receiver?.name || "Unknown User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lv.{req.receiver?.level || 1} · {(req.receiver?.xp || 0)} XP
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-secondary/50">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="p-4 rounded-2xl bg-card border border-border/30">
              <h3 className="font-serif font-bold text-charcoal mb-3 flex items-center gap-2">
                <Users size={18} className="text-sage" />
                Friends ({friends.length})
              </h3>
              {friends.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No friends yet. Send a request to start connecting!
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20"
                    >
                      <div className="w-10 h-10 rounded-full bg-coral/10 flex items-center justify-center">
                        {friend.avatar ? (
                          <img
                            src={friend.avatar}
                            alt={friend.name || "User"}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-charcoal text-sm">{friend.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          Lv.{friend.level} · {friend.xp} XP
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">Friend</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Decks Section */}
        {activeSection === "decks" && (
          <div className="space-y-6">
            {/* Create Deck */}
            <div className="p-4 rounded-2xl bg-card border border-border/30">
              <h3 className="font-serif font-bold text-charcoal mb-3 flex items-center gap-2">
                <Plus size={18} className="text-coral" />
                Create New Deck
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Deck name (e.g., Japanese Greetings)"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
                  onKeyDown={(e) => e.key === "Enter" && createDeck()}
                />
                <button
                  onClick={createDeck}
                  disabled={creatingDeck || !deckName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-coral text-white text-sm font-medium hover:bg-coral/90 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Public Decks */}
            <div className="p-4 rounded-2xl bg-card border border-border/30">
              <h3 className="font-serif font-bold text-charcoal mb-3">
                Public Decks
              </h3>
              {publicDecks.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No public decks available yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {publicDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="p-4 rounded-xl bg-secondary/20 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-charcoal">{deck.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          by {deck.owner?.name || "Unknown"} · {deck._count?.words || 0} words · {deck._count?.members || 0} learners
                        </p>
                      </div>
                      <button
                        onClick={() => joinDeck(deck.id)}
                        className="px-4 py-2 rounded-xl bg-sage text-white text-sm font-medium hover:bg-sage/90"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        {activeSection === "leaderboard" && (
          <div className="p-4 rounded-2xl bg-card border border-border/30">
            <h3 className="font-serif font-bold text-charcoal mb-4 flex items-center gap-2">
              <Heart size={18} className="text-coral" />
              Global Leaderboard
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div
                  key={rank}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20"
                >
                  <span className="w-6 h-6 rounded-full bg-butter/20 text-butter text-xs font-bold flex items-center justify-center">
                    {rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-coral/10 flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-charcoal text-sm">
                      Player {rank}
                    </p>
                    <p className="text-xs text-muted-foreground">Lv.{10 - rank}</p>
                  </div>
                  <span className="text-sm font-bold text-coral">
                    {(1000 - rank * 50)} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className="w-full py-3 rounded-2xl border border-border text-muted-foreground text-sm hover:border-red-500/30 hover:text-red-500 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
      />
    </>
  );
}
