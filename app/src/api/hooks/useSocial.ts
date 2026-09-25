import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import type { Badge } from "./useSessions";

export interface PublicUser {
  id: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface Friend {
  friendshipId: number;
  user: PublicUser;
}

export interface FriendRequest {
  friendshipId: number;
  createdAt: string;
  user: PublicUser;
}

export interface FeedPost {
  postId: number;
  caption: string | null;
  createdAt: string;
  user: PublicUser;
  session: {
    id: number;
    schemaName: string;
    startedAt: string;
    rating: number | null;
    notes: string | null;
    progressSummary: { sessionBadge: Badge } | null;
  };
  likeCount: number;
  likedByMe: boolean;
}

export function useFriends() {
  return useQuery({ queryKey: ["friends"], queryFn: () => api.get<{ friends: Friend[] }>("/friends").then((r) => r.friends) });
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => api.get<{ requests: FriendRequest[] }>("/friends/requests").then((r) => r.requests),
  });
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ["user-search", query],
    queryFn: () => api.get<{ users: PublicUser[] }>(`/users/search?q=${encodeURIComponent(query)}`).then((r) => r.users),
    enabled: query.trim().length > 1,
  });
}

export function useSendFriendRequest() {
  return useMutation({
    mutationFn: (toUsername: string) => api.post<{ result: string }>("/friends/requests", { toUsername }),
  });
}

export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendshipId, accept }: { friendshipId: number; accept: boolean }) =>
      api.post(`/friends/requests/${friendshipId}/${accept ? "accept" : "decline"}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useFeed() {
  return useQuery({ queryKey: ["feed"], queryFn: () => api.get<{ posts: FeedPost[] }>("/feed").then((r) => r.posts) });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sessionId: number; caption?: string }) => api.post<{ postId: number }>("/posts", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, liked }: { postId: number; liked: boolean }) =>
      liked ? api.delete(`/posts/${postId}/like`) : api.post(`/posts/${postId}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}
