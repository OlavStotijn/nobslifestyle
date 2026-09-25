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

interface FeedPostBase {
  postId: number;
  caption: string | null;
  location: string | null;
  photoUrl: string | null;
  createdAt: string;
  user: PublicUser;
  likeCount: number;
  likedByMe: boolean;
}

export interface StrengthFeedPost extends FeedPostBase {
  type: "strength";
  session: {
    id: number;
    schemaName: string;
    startedAt: string;
    rating: number | null;
    notes: string | null;
    progressSummary: { sessionBadge: Badge } | null;
  };
}

export interface CardioFeedPost extends FeedPostBase {
  type: "cardio";
  cardio: {
    id: number;
    activityType: "running" | "cycling";
    startedAt: string;
    distanceM: number;
    durationS: number;
    calories: number;
    rating: number | null;
    notes: string | null;
  };
}

export type FeedPost = StrengthFeedPost | CardioFeedPost;

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

export interface CreatePostInput {
  sessionId?: number;
  cardioSessionId?: number;
  caption?: string;
  location?: string;
  photo?: Blob;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => {
      const form = new FormData();
      if (input.sessionId) form.append("sessionId", String(input.sessionId));
      if (input.cardioSessionId) form.append("cardioSessionId", String(input.cardioSessionId));
      if (input.caption) form.append("caption", input.caption);
      if (input.location) form.append("location", input.location);
      if (input.photo) form.append("image", input.photo, "post.jpg");
      return api.postForm<{ postId: number }>("/posts", form);
    },
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

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
  user: PublicUser;
}

export function useComments(postId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => api.get<{ comments: Comment[] }>(`/posts/${postId}/comments`).then((r) => r.comments),
    enabled,
  });
}

export function useAddComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<{ comment: Comment }>(`/posts/${postId}/comments`, { body }).then((r) => r.comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}

export function useDeleteComment(postId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => api.delete(`/posts/${postId}/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", postId] }),
  });
}
