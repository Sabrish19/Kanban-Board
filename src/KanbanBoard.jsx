import React, {
  useState,
  useEffect,
  useContext,
  useReducer,
  useRef,
  createContext,
  useMemo,
} from "react";
import "./KanbanBoard.css";

// Context
const KanbanContext = createContext();

const initialState = {
  todo: [],
  inProgress: [],
  done: [],
};

// Reducer
function kanbanReducer(state, action) {
  switch (action.type) {
    case "MOVE_CARD": {
      const { card, from, to, targetId } = action.payload;

      const newSource = state[from].filter((c) => c.id !== card.id);
      let newTarget = state[to].filter((c) => c.id !== card.id);

      const targetIndex = newTarget.findIndex((c) => c.id === targetId);

      if (targetIndex === -1 || from !== to) {
        newTarget.push(card);
      } else {
        newTarget.splice(targetIndex, 0, card);
      }

      return {
        ...state,
        [from]: newSource,
        [to]: newTarget,
      };
    }

    case "ADD_TASK": {
      const newTask = {
        id: Date.now().toString(),
        text: action.payload.text,
      };
      return {
        ...state,
        todo: [...state.todo, newTask],
      };
    }

    case "DELETE_TASK": {
      const { cardId, from } = action.payload;
      return {
        ...state,
        [from]: state[from].filter((card) => card.id !== cardId),
      };
    }

    case "EDIT_CARD": {
      const { cardId, from, newText } = action.payload;
      return {
        ...state,
        [from]: state[from].map((card) =>
          card.id === cardId ? { ...card, text: newText } : card
        ),
      };
    }

    default:
      return state;
  }
}

// Provider
function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const [draggedCardId,setDraggedCardId]=useState(null);
  const[hoverTargetId,setHoverTargetId]=useState(null);

  const value = useMemo(() => ({ state, dispatch,draggedCardId,setDraggedCardId,hoverTargetId,setHoverTargetId}), [state,draggedCardId,hoverTargetId]);

  return (
    <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
  );
}

// Task Input
function TaskInput() {
  const { dispatch } = useContext(KanbanContext);
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: "ADD_TASK", payload: { text } });
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input
        type="text"
        className="task-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add new task"
      />
      <button type="submit" className="add-btn">
        Add
      </button>
    </form>
  );
}

// Card Component
function Card({ card, from }) {
  const { dispatch,draggedCardId,setDraggedCardId,hoverTargetId,setHoverTargetId} = useContext(KanbanContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(card.text);
  const inputRef = useRef(null);

  const handleDragStart = (e) => {
    if (!isEditing) {
      setDraggedCardId(card.id);
      e.dataTransfer.setData("card", JSON.stringify({ card, from }));
    }
  };

  const handleDragOver=(e)=>{
    e.preventDefault();
    if(draggedCardId!==card.id){
      setHoverTargetId(card.id);
    }
  }

  const handleDragLeave=()=>{
    if(hoverTargetId!==card.id){
      setHoverTargetId(null)
    }
  }

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleEditSubmit = () => {
    const trimmed = editedText.trim();
    if (trimmed && trimmed !== card.text) {
      dispatch({
        type: "EDIT_CARD",
        payload: { cardId: card.id, from, newText: trimmed },
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setEditedText(card.text);
      setIsEditing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("card"));
    dispatch({
      type: "MOVE_CARD",
      payload: {
        card: data.card,
        from: data.from,
        to: from,
        targetId: card.id,
      },
    });
    setDraggedCardId(null)
    setHoverTargetId(null)
  };

  return (
    <div
      className={`card ${hoverTargetId===card.id?"drop-indicator":" "}`}
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEditing ? (
        <input
          type="text"
          ref={inputRef}
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onBlur={handleEditSubmit}
          onKeyDown={handleKeyDown}
          className="edit-input"
        />
      ) : (
        card.text
      )}
    </div>
  );
}

// Column
function Column({ title, columnKey, className }) {
  const { state, dispatch, setHoverTargetId, setDraggedCardId } = useContext(KanbanContext);

  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;

    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("card"));
      dispatch({
        type: "MOVE_CARD",
        payload: { card: data.card, from: data.from, to: columnKey },
      });

      setHoverTargetId(null)
      setDraggedCardId(null)
    };

    dropArea.addEventListener("dragover", (e) => e.preventDefault());
    dropArea.addEventListener("drop", handleDrop);

    return () => {
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, [dispatch, columnKey]);

  return (
    <div className={`column ${className}`} ref={dropRef}>
      <h2>{title}</h2>
      {state[columnKey].map((card) => (
        <Card key={card.id} card={card} from={columnKey} />
      ))}
    </div>
  );
}

// Trash Drop Zone
function TrashDropZone({ onCardDrop }) {
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;

    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("card"));
      onCardDrop({ card: data.card, from: data.from });
    };

    dropArea.addEventListener("dragover", (e) => e.preventDefault());
    dropArea.addEventListener("drop", handleDrop);

    return () => {
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, [onCardDrop]);

  return (
    <div className="trash-drop-zone" ref={dropRef}>
      <h2>🗑 DUST BIN</h2>
    </div>
  );
}

// Kanban Board (Main)
function KanbanBoard() {
  const { dispatch } = useContext(KanbanContext);
  const [modelData, setModelData] = useState(null);

  const handleConfirmDelete = () => {
    if (modelData) {
      dispatch({
        type: "DELETE_TASK",
        payload: { cardId: modelData.card.id, from: modelData.from },
      });
      setModelData(null);
    }
  };

  return (
    <div className="board-container">
      <TaskInput />
      <div className="board">
        <Column title="📝 To-Do" columnKey="todo" className="column-red" />
        <Column
          title="⏳ In Progress"
          columnKey="inProgress"
          className="column-yellow"
        />
        <Column title="✅ Done" columnKey="done" className="column-green" />
        <TrashDropZone onCardDrop={setModelData} />
      </div>

      {modelData && (
        <div className="model-overlay">
          <div className="model">
            <p>
              Are you sure you want to delete this task:{" "}
              <strong>{modelData.card.text}</strong>?
            </p>
            <div className="model-buttons">
              <button className="delete-btn" onClick={handleConfirmDelete}>
                Yes, Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => setModelData(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper with Provider
function KanbanBoardWrapper() {
  return (
    <KanbanProvider>
      <KanbanBoard />
    </KanbanProvider>
  );
}

export default KanbanBoardWrapper