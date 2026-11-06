import type {DevelopmentConfig} from '../../shared/development.mjs';

// Never infer a floor plan from area or bedroom count. The management portal
// must explicitly connect a plan to the numbered unit in the correct tower.
export function resolveUnitPlan(config: DevelopmentConfig, number: number) {
  const unit = config.units.find(u => u.tower === 'a'
    && u.label.trim().replace(/^(apto\.?|apartamento|unidade)\s*/i, '') === String(number));
  return unit?.planId ? config.plans.find(p => p.id === unit.planId) : undefined;
}
