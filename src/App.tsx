import { RouterProvider } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { router } from "./router";

export default function App() {
  return (
    // Honor the OS reduced-motion setting for all framer-motion springs.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
