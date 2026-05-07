import { Container, Paper } from "@mui/material";
import { forwardRef } from "react";

interface CanvasPreviewProps {
  width: number;
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  isEyedropperActive: boolean;
}

const CanvasPreview = forwardRef<HTMLCanvasElement, CanvasPreviewProps>(
  ({ width, onCanvasClick, isEyedropperActive }, ref) => {
    return (
      <Container
        component="main"
        sx={{
          mt: 4,
          mb: 10,
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          height: "calc(100vh - 128px)",
          overflow: "hidden",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 1,
            bgcolor: "#f5f5f5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 300,
            minHeight: 200,
            width: "100%",
            height: "100%",
            overflow: "auto",
          }}
        >
          <canvas
            ref={ref}
            onClick={onCanvasClick}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              display: "block",
              border: width > 0 ? "1px solid #888" : "none",
              boxShadow: width > 0 ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
              cursor: isEyedropperActive ? "crosshair" : "default",
              backgroundImage:
                width > 0
                  ? "repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%)"
                  : "none",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 10px 10px",
            }}
          />
        </Paper>
      </Container>
    );
  }
);

CanvasPreview.displayName = "CanvasPreview";

export default CanvasPreview;
