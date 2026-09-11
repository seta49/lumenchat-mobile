import { Redirect } from "expo-router";

/** Profile digabung ke Settings hub — rute lama tetap jalan biar link nggak putus. */
export default function Profile() {
  return <Redirect href="/settings" />;
}
