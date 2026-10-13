"use client";

import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { getTrafficSourcesData } from "@/services/api/home";
import { MenuDotsIcon } from "@/utils/icon";
import { useQuery } from "@tanstack/react-query";
import TrafficSourcesSkeleton from "./skeleton";
import { mapTrafficSourcesResponse } from "./utils";
import type { TrafficSourceViewModel } from "./types";

interface TrafficSourcesProps {
  /** Rows to show instead of the template's mock API data. */
  sources?: TrafficSourceViewModel[];
  title?: string;
  valueHeading?: string;
}

export default function TrafficSources({
  sources: providedSources,
  title = "Traffic Sources",
  valueHeading = "Impression",
}: TrafficSourcesProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["traffic-sources"],
    queryFn: getTrafficSourcesData,
    enabled: !providedSources,
  });

  if (!providedSources && (isLoading || !data)) {
    return <TrafficSourcesSkeleton />;
  }

  const sources = providedSources ?? mapTrafficSourcesResponse(data!);

  return (
    <Card>
      {/* Header */}
      <CardHeader className="mb-6">
        <CardTitle className="leading-6 font-semibold text-text-primary">{title}</CardTitle>

        <Button iconOnly size="xs" variant="ghost">
          <MenuDotsIcon />
        </Button>
      </CardHeader>

      {/* Traffic chart */}
      <CardContent className="flex flex-col p-0">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="block text-sm leading-5 font-medium text-text-tertiary">Source</span>
          <span className="block text-sm leading-5 font-medium text-text-tertiary">{valueHeading}</span>
        </div>

        <div className="flex flex-col gap-2">
          {sources.map((source, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex h-8 max-w-[90%] flex-1 items-center">
                <div
                  className="flex h-full min-w-fit items-center rounded bg-background-gray-secondary_alt px-3 whitespace-nowrap"
                  style={{ width: `${source.percentage}%` }}
                >
                  <span className="text-sm font-medium text-text-primary">{source.name}</span>
                </div>
              </div>
              <span className="text-sm font-medium text-text-primary">{source.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
