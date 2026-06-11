"use client";
import { usePathname } from "next/navigation";

const Ruta = ({ }) => {
    const path = usePathname()
    return <div>{path}</div>
}

export default Ruta