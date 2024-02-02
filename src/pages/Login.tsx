import { Show } from 'solid-js';
import styles from './Login.module.css'
import { Navigate, useNavigate } from '@solidjs/router';

export default function LoginPage() {
  const navigate = useNavigate()

  const onLoginClick = async () => {
    const res = await fetch("https://nerimity.com/api/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: (document.querySelector("[d-e]") as HTMLInputElement).value,
        password: (document.querySelector("[d-p]") as HTMLInputElement).value
      })
    })
    const json = await res.json();
    if (res.status !== 200) {
      return alert(json.message)
    } 
    localStorage["token"] = json.token;
    navigate("/app")
  }

  return (
    <Show when={!localStorage["token"]} fallback={<Navigate href="/app" />}>
      <div class={styles.page}>
        <h1>Login</h1>
        <input d-e type="text" placeholder="Email" />
        <input d-p type="password" placeholder="Password" />
        <button onClick={onLoginClick}>Login</button>
      </div>
    </Show>
  )
}