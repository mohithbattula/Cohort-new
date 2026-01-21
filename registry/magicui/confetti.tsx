
import React, { createContext, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import confetti from "canvas-confetti";

export interface ConfettiRef {
    fire: (opts?: any) => void;
}

interface Api {
    fire: (options?: any) => void;
}

type Props = React.ComponentPropsWithRef<"canvas"> & {
    options?: any;
    globalOptions?: any;
    manualstart?: boolean;
    children?: React.ReactNode;
};

export type ConfettiGlobalOptions = {
    resize: boolean;
    useWorker: boolean;
};

export const Confetti = forwardRef<ConfettiRef, Props>((props, ref) => {
    const {
        options,
        globalOptions = { resize: true, useWorker: true },
        manualstart = false,
        children,
        ...rest
    } = props;
    const instanceRef = useRef<any>(null); // confetti.CreateTypes | null

    const canvasRef = useCallback(
        // https://react.dev/reference/react-dom/components/common#ref-callback
        // https://reactjs.org/docs/refs-and-the-dom.html#callback-refs
        (node: HTMLCanvasElement) => {
            if (node !== null) {
                // <canvas> is mounted => create the confetti instance
                if (instanceRef.current) return; // if not null, we already have an instance
                instanceRef.current = confetti.create(node, {
                    ...globalOptions,
                    resize: true,
                });
            } else {
                // <canvas> is unmounted => dispose the instance
                if (instanceRef.current) {
                    instanceRef.current.reset();
                    instanceRef.current = null;
                }
            }
        },
        [globalOptions],
    );

    // `fire` is a function that calls the instance() with `opts` merged with `options`
    const fire = useCallback(
        (opts = {}) => {
            instanceRef.current?.({ ...options, ...opts });
        },
        [options],
    );

    const api = useMemo(
        () => ({
            fire,
        }),
        [fire],
    );

    useImperativeHandle(ref, () => api, [api]);

    useEffect(() => {
        if (!manualstart) {
            fire();
        }
    }, [manualstart, fire]);

    return (
        <canvas
            ref={canvasRef}
            {...rest}
        />
    );
});

import { useMemo } from "react";

Confetti.displayName = "Confetti";

export default Confetti;
