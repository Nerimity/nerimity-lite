import { For, Show, createEffect, createMemo, createSignal, on, onMount } from 'solid-js';
import styles from './App.module.css'
import { A, Navigate, useMatch, useNavigate } from '@solidjs/router';

import { ServerMember, setStore, store, ws } from '../store';
import { ChannelType, RawChannel, RawMessage, RawServer, RawServerMember, RawServerRole } from '../RawData';

export default function AppPage() {
  return (
    <Show when={localStorage["token"]} fallback={<Navigate href="/" />}>
      <div class={styles.page}>
        <ServerList/>
        <MainContainer/>
        <MembersList/>
      </div>
    </Show>
  )
}

const MainContainer = () => {
  const chatAreaMatch = useMatch(() => "/app/servers/:serverId/:channelId");

  return (
    <div class={styles.mainPane}>
      <ChannelPane channelId={chatAreaMatch().params.channelId} serverId={chatAreaMatch().params.serverId} />

    </div>
  )
}



const ChannelPane = (props: {channelId: string, serverId?: string}) => {

  const messages = () => store.messages[props.channelId];

  createEffect(async () => {
    if (messages()) {
      return;
    }
    const res = await fetch(`https://nerimity.com/api/channels/${props.channelId}/messages`, {
      method: "GET",
      headers: {
        "Authorization": localStorage["token"]
      }
    })
    const json = await res.json();
    if (res.status !== 200) {
      return alert(json.message)
    } 
    setStore("messages", props.channelId, json)
  })

  return (
    <>
      <MessageLog messages={messages()} serverId={props.serverId} />
    </>
  )
}

const MessageLog = (props: { messages: RawMessage[], serverId?: string }) => {
  let messageLogRef: HTMLDivElement | undefined;

  createEffect(on(() => props.messages.length, () => {
    if (messageLogRef) {
      messageLogRef.scrollTop = messageLogRef.scrollHeight;
    }
  }))

  return (
    <div class={styles.messageLog} ref={messageLogRef}>
      <For each={props.messages}>
        {(message) => <MessageItem message={message} serverId={props.serverId} /> }
      </For>
    </div>
  )
}

const MessageItem = (props: { message: RawMessage, serverId?: string }) => {
  const [roleColor, setRoleColor] = createSignal("#fff");
  
  const higherPriorityRole = createMemo(() => {
    if (!props.serverId) {
      return null;
    }
    const roleIds = store.serverMembers[props.serverId]?.[props.message.createdBy.id]?.roleIds;
    const roles = roleIds?.map(roleId => store.serverRoles?.[props.serverId]?.[roleId]).sort((a, b) => b.order - a.order);
    return roles?.[0];
  })


  createEffect(() => {
    setRoleColor(higherPriorityRole()?.hexColor || "#fff");
  })

  const date = Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(props.message.createdAt))

  return (
    <div class={styles.message}>
      <span class={styles.details}>
        <span>[{date}]</span>
        <span style={{color: roleColor()}}>{props.message.createdBy.username}</span>
      </span>
      <span class={styles.content}>{props.message.content}</span>
    </div>
  )
}



const MembersList = () => {
  const match = useMatch(() => "/app/servers/:id/*");

  const orderedRoles = createMemo(() => {
    const roles = Object.values(store.serverRoles[match().params.id] || {}).filter(role => !role.hideRole);
    return roles.sort((a, b) => b.order - a.order)
  })
  const hiddenRoleIds = createMemo(() => {
    const roles = Object.values(store.serverRoles[match().params.id] || {});
    return roles.filter(role => role.hideRole).map(role => role.id)
  })

  return (
    <div class={styles.pane}>
      <h3>Members</h3>
      <For each={orderedRoles()}>
        {(role) => <RoleItem role={role} hiddenRoleIds={hiddenRoleIds()} /> }
      </For>
    </div>
  )
} 


const RoleItem = (props: { role: RawServerRole, hiddenRoleIds: string[] }) => {

  const defaultRoleId = createMemo(() => store.servers[props.role.serverId].defaultRoleId);

  const members = createMemo(() => {
    const members = Object.values(store.serverMembers[props.role.serverId] || {});
    if (props.role.id === defaultRoleId()) {
      return members
        .filter(member => !member.roleIds.length || member.roleIds.every(roleId => props.hiddenRoleIds.includes(roleId)))
        .sort((a, b) => store.users[a.userId].username.localeCompare(store.users[b.userId].username))
        .filter(member => store.userPresences[member.userId]?.status)
    }
    return members.filter(member => member.roleIds.includes(props.role.id)).filter(member => {
      const memberRoles = member.roleIds.map(roleId => store.serverRoles[member.serverId][roleId]).sort((a, b) => b.order - a.order);
      return memberRoles[0].id === props.role.id
    })
    .sort((a, b) => store.users[a.userId].username.localeCompare(store.users[b.userId].username))
    .filter(member => store.userPresences[member.userId]?.status)
  })



  return (
    <Show when={members().length}>
      <div class={styles.server}>{props.role.name}</div>
      <div class={styles.treeNestedList}>
        <For each={members()}>
          {(member) => <MemberItem member={member} /> }
        </For>
      </div>
    </Show>
  )

}

const MemberItem = (props: { member: ServerMember }) => {

  const higherPriorityRole = createMemo(() => {
    const roles = props.member.roleIds.map(roleId => store.serverRoles[props.member.serverId][roleId]).sort((a, b) => b.order - a.order);
    return roles[0]
  });

  return (<div class={styles.nestedTreeItem} style={{color: higherPriorityRole()?.hexColor || "white"}} >{store.users[props.member.userId].username}</div>)
}


const ServerList = () => {
  const servers = () => Object.values(store.servers);

  const orderedServers = createMemo(() => {
    const orderedServerIds = store.user?.orderedServerIds;
    return servers()
      .sort((a, b) => a.createdAt - b.createdAt)
      .sort((a, b) => {
        const orderA = orderedServerIds.indexOf(a.id);
        const orderB = orderedServerIds.indexOf(b.id);
        if (orderA === -1) {
          return -1;
        }
        if (orderB === -1) {
          return 1;
        }
        return orderA - orderB;
      })
  })

  return (
    <div class={styles.pane}>
      <h3>Servers</h3>

      <For each={orderedServers()}>
        {(server) => <ServerItem server={server} /> }
      </For>

    </div>
  )
}

const ServerItem = (props: { server: RawServer }) => {
  const href = () => `/app/servers/${props.server.id}/`;
  const active = useMatch(() => href() + "*");

  const channels = () => Object.values(store.channels)
    .filter(channel => channel.serverId === props.server.id && channel.type === ChannelType.SERVER_TEXT)
    .sort((a, b) => a.order - b.order)


  return (
    <>
      <A classList={{[styles.active]: !!active()}} href={href() + props.server.defaultChannelId}>{props.server.name}</A>
      <Show when={active()}>
        <div class={styles.treeNestedList}>
          <For each={channels()}>
            {(channel) => <ChannelItem channel={channel} /> }
          </For>
        </div>
      </Show>
    </>
  )
}

const ChannelItem = (props: { channel: RawChannel }) => {
  const href = () => `/app/servers/${props.channel.serverId}/${props.channel.id}`;

  return (<A activeClass={styles.active} class={styles.nestedTreeItem} href={href()}>{props.channel.name}</A>)
}