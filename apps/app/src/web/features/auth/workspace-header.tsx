import { useCurrentUser } from "./hooks";

export function WorkspaceHeader() {
  const me = useCurrentUser();
  const user = me.data?.user;

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">Thread Workspace</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">{user.email}</span>
        {user.username ? ` (${user.username})` : ""}.
      </p>
    </div>
  );
}
