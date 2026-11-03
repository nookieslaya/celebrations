import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface EditorOperations {
  pending: boolean;
  hasPending: () => boolean;
  begin: () => () => void;
}

const Context = createContext<EditorOperations | null>(null);

export function EditorOperationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const count = useRef(0);
  const [pending, setPending] = useState(false);

  function begin() {
    count.current += 1;
    setPending(true);
    let finished = false;

    return () => {
      if (finished) {
        return;
      }
      finished = true;
      count.current -= 1;
      setPending(count.current > 0);
    };
  }

  return (
    <Context.Provider
      value={{ pending, hasPending: () => count.current > 0, begin }}
    >
      {children}
    </Context.Provider>
  );
}

export function useEditorOperations() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Editor operations require the shared editor provider.");
  }
  return context;
}
