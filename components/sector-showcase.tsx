"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sectors } from "@/content/site";

export function SectorShowcase() {
  return (
    <Tabs defaultValue={sectors[0].slug}>
      <TabsList aria-label="Selecciona un sector">
        {sectors.map((sector) => <TabsTrigger value={sector.slug} key={sector.slug}>{sector.name}</TabsTrigger>)}
      </TabsList>
      {sectors.map((sector, index) => (
        <TabsContent value={sector.slug} key={sector.slug}>
          <div className="sector-panel">
            <div className="sector-copy">
              <span className="tag"><span className="dot" /> Demo sectorial · Conceptual</span>
              <p className="sector-number">0{index + 1}</p>
              <h3>De “{sector.pain.toLowerCase()}” a un recorrido que sí continúa.</h3>
              <p>{sector.flow}</p>
              <div className="sector-modules">{sector.modules.map((module) => <span key={module}><Check />{module}</span>)}</div>
              <Button asChild variant="outline"><Link href={`/demo/${sector.slug}`}>Probar el recorrido <ArrowUpRight /></Link></Button>
            </div>
            <div className="sector-device">
              <div className="sector-device-top"><span>VIRRO / {sector.name}</span><span>● LIVE DEMO</span></div>
              <div className="sector-device-body">
                <small>Tu siguiente paso</small><h4>{sector.modules[0]} + {sector.modules[1]}</h4>
                <div className="demo-chat"><span>Hola, quiero conocer opciones.</span><span>Claro. Te muestro y después decides.</span><span>Ver disponibilidad →</span></div>
              </div>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
