import { createStore, reconcile } from "solid-js/store"
import { RawChannel, RawMessage, RawPresence, RawServer, RawServerMember, RawServerRole, RawUser } from "./RawData"
import { AuthenticatedPayload, SelfUser } from "./ConnectionEventTypes"
import { batch } from "solid-js"

export const ws = new WebSocket("wss://nerimity.com/socket.io/?EIO=4&transport=websocket")

export type ServerMember = {
  userId: string;
} & Omit<RawServerMember, "user">

export const [store, setStore] = createStore({
  user: null as SelfUser | null,

  messages: {} as Record<string, RawMessage[]>,

  users: {} as Record<string, RawUser>,
  servers: {} as Record<string, RawServer>,
  serverMembers: {} as Record<string, Record<string, ServerMember>>,
  serverRoles: {} as Record<string, Record<string, RawServerRole>>,
  channels: {} as Record<string, RawChannel>,
  userPresences: {} as Record<string, RawPresence>,
})


ws.onmessage = (e) => {
  if (e.data.startsWith("2")) {
    return ws.send("3")
  }
  if (e.data.startsWith("0")) {
    return ws.send("40")
  }
  if (e.data.startsWith("40")) {
    return emit("user:authenticate", {token: localStorage["token"]})
  }
  if (e.data.startsWith("42")) {
    const [name, payload] = JSON.parse(e.data.slice(2))
    if (name === "user:authenticated") return onAuthEvent(payload)
  }
}

const onAuthEvent = (payload: AuthenticatedPayload) => {
  batch(() => {
    setStore("user", payload.user)
    for (let i = 0; i < payload.servers.length; i++) {
      const server = payload.servers[i];
      setStore("servers", server.id, reconcile(server))
    }
  })

  batch(() => {
    for (let i = 0; i < payload.channels.length; i++) {
      const channel = payload.channels[i];
      setStore("channels", channel.id, reconcile(channel))    
    }
  })

  batch(() => {
    for (let i = 0; i < payload.serverMembers.length; i++) {
      const {user, ...member} = payload.serverMembers[i];
      if (!store.serverMembers[member.serverId]) {
        setStore("serverMembers", member.serverId, {})
      }
      setStore("users", user.id, reconcile(user))
      setStore("serverMembers", member.serverId, user.id, reconcile({...member, userId: user.id}))
    }
  })

  batch(() => {
    for (let i = 0; i < payload.serverRoles.length; i++) {
      const role = payload.serverRoles[i];
      if (!store.serverRoles[role.serverId]) {
        setStore("serverRoles", role.serverId, {})
      }
      setStore("serverRoles", role.serverId, role.id, reconcile(role))
    }
  })

  batch(() => {
    for (let i = 0; i < payload.presences.length; i++) {
      const presence = payload.presences[i];
      setStore("userPresences", presence.userId, reconcile(presence))
    }
  })
  
}



const emit = (name: string, data: any) => {
  ws.send(`42${JSON.stringify([name, data])}`)
}