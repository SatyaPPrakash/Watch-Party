import { useState } from "react";
import { ErrorProvider } from "./context/ErrorContext";
import { RoomProvider } from "./context/RoomContext";
import { ErrorDialog } from "./components/ErrorDialog";
import { Home } from "./pages/Home";
import { Room } from "./pages/Room";

type View = "home" | "room";

export function App() {
  const [view, setView] = useState<View>("home");

  return (
    <ErrorProvider>
      <RoomProvider>
        {view === "home" ? (
          <Home onEnterRoom={() => setView("room")} />
        ) : (
          <Room />
        )}
        <ErrorDialog />
      </RoomProvider>
    </ErrorProvider>
  );
}
