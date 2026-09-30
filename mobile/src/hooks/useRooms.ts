import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile } from "@/lib/dashboard-data";
import { createRoom, getMyRooms, joinRoomByCode, leaveRoom } from "@/lib/rooms-data";
import { supabase } from "@/lib/supabase/client";

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(supabase, userId),
    enabled: !!userId,
  });
}

export function useMyRooms(userId: string) {
  const query = useQuery({
    queryKey: ["myRooms", userId],
    queryFn: () => getMyRooms(supabase, userId),
    enabled: !!userId,
  });
  const rooms = query.data ?? [];
  return {
    ...query,
    rooms,
    defaultRoom: rooms.find((r) => r.is_default) ?? null,
    otherRooms: rooms.filter((r) => !r.is_default),
  };
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createRoom(supabase, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myRooms"] }),
  });
}

export function useJoinRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => joinRoomByCode(supabase, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myRooms"] }),
  });
}

export function useLeaveRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => leaveRoom(supabase, roomId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myRooms"] }),
  });
}
