'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';


export default function DashboardContentPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/dashboard/memory-space');
    }, [router]);

    return null;
}