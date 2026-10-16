import React from "react";
import { Composition } from "remotion";
import { DEMO_SPEC } from "./demo";
import { ShipreelVideo } from "./ShipreelVideo";
import { DIMENSIONS, FPS, normalizeSpec, type CompositionProps } from "./spec";
import { totalDurationFrames } from "./timeline";

export const COMPOSITION_ID = "Shipreel";

const defaults: CompositionProps = {
  spec: normalizeSpec(DEMO_SPEC),
  assetBase: "http://localhost:4747/api/media/demo",
  publicBase: "",
};

export const Root: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={ShipreelVideo}
    fps={FPS}
    width={1080}
    height={1920}
    durationInFrames={totalDurationFrames(defaults.spec)}
    defaultProps={defaults}
    calculateMetadata={({ props }) => {
      const spec = normalizeSpec(props.spec);
      const { width, height } = DIMENSIONS[spec.aspect];
      return { durationInFrames: totalDurationFrames(spec), width, height, props: { ...props, spec } };
    }}
  />
);
