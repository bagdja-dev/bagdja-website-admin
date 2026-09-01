'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '../lib/api-client';
import { FormSelect } from './form-field';
import type { FulfillmentFlow } from '../lib/types';

export function FlowPicker({
  websiteId,
  value,
  onChange,
}: {
  websiteId?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [flows, setFlows] = useState<FulfillmentFlow[]>([]);

  useEffect(() => {
    if (!websiteId) return;
    apiClient<FulfillmentFlow[]>(`/api/websites/${websiteId}/fulfillment-flows`)
      .then(setFlows)
      .catch(() => setFlows([]));
  }, [websiteId]);

  return (
    <FormSelect
      label="Master Flow"
      description="Langkah layanan diambil dari Master Flow yang dipilih."
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: 'Pilih Master Flow' },
        ...flows.filter((flow) => flow.is_active || flow.id === value).map((flow) => ({
          value: flow.id,
          label: flow.name,
        })),
      ]}
    />
  );
}
