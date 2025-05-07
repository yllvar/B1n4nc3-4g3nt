"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, RotateCcw } from "lucide-react"
import type { StrategyParameters } from "@/lib/trading/strategies/scalping-strategy"

interface StrategyParametersProps {
  parameters: StrategyParameters
  onParametersChange: (params: Partial<StrategyParameters>) => void
  isLoading?: boolean
}

const StrategyParameters: React.FC<StrategyParametersProps> = ({
  parameters,
  onParametersChange,
  isLoading = false,
}) => {
  const [localParams, setLocalParams] = useState<StrategyParameters>(parameters)
  const [activeTab, setActiveTab] = useState("indicators")
  const [hasChanges, setHasChanges] = useState(false)

  // Update local params when props change
  useEffect(() => {
    setLocalParams(parameters)
    setHasChanges(false)
  }, [parameters])

  const handleParamChange = (key: keyof StrategyParameters, value: any) => {
    setLocalParams((prev) => {
      const updated = { ...prev, [key]: value }
      setHasChanges(true)
      return updated
    })
  }

  const handleSave = () => {
    onParametersChange(localParams)
    setHasChanges(false)
  }

  const handleReset = () => {
    setLocalParams(parameters)
    setHasChanges(false)
  }

  const timeframeOptions = [
    { value: "1m", label: "1 minute" },
    { value: "5m", label: "5 minutes" },
    { value: "15m", label: "15 minutes" },
    { value: "30m", label: "30 minutes" },
    { value: "1h", label: "1 hour" },
    { value: "4h", label: "4 hours" },
    { value: "1d", label: "1 day" },
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Strategy Parameters</CardTitle>
        <CardDescription>Customize trading strategy parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
            <TabsTrigger value="risk">Risk Management</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="interval">Timeframe</Label>
                  <Select
                    value={localParams.interval}
                    onValueChange={(value) => handleParamChange("interval", value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeframeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Short EMA Period: {localParams.shortEmaPeriod}</Label>
                <Slider
                  id="shortEmaPeriod"
                  min={5}
                  max={50}
                  step={1}
                  value={[localParams.shortEmaPeriod]}
                  onValueChange={([value]) => handleParamChange("shortEmaPeriod", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Long EMA Period: {localParams.longEmaPeriod}</Label>
                <Slider
                  id="longEmaPeriod"
                  min={10}
                  max={200}
                  step={1}
                  value={[localParams.longEmaPeriod]}
                  onValueChange={([value]) => handleParamChange("longEmaPeriod", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>RSI Period: {localParams.rsiPeriod}</Label>
                <Slider
                  id="rsiPeriod"
                  min={7}
                  max={21}
                  step={1}
                  value={[localParams.rsiPeriod]}
                  onValueChange={([value]) => handleParamChange("rsiPeriod", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RSI Overbought: {localParams.rsiOverbought}</Label>
                  <Slider
                    id="rsiOverbought"
                    min={60}
                    max={90}
                    step={1}
                    value={[localParams.rsiOverbought]}
                    onValueChange={([value]) => handleParamChange("rsiOverbought", value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RSI Oversold: {localParams.rsiOversold}</Label>
                  <Slider
                    id="rsiOversold"
                    min={10}
                    max={40}
                    step={1}
                    value={[localParams.rsiOversold]}
                    onValueChange={([value]) => handleParamChange("rsiOversold", value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>VWAP Period: {localParams.vwapPeriod}</Label>
                <Slider
                  id="vwapPeriod"
                  min={10}
                  max={50}
                  step={1}
                  value={[localParams.vwapPeriod]}
                  onValueChange={([value]) => handleParamChange("vwapPeriod", value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risk">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Take Profit: {(localParams.takeProfitPercent * 100).toFixed(2)}%</Label>
                <Slider
                  id="takeProfitPercent"
                  min={0.001}
                  max={0.05}
                  step={0.001}
                  value={[localParams.takeProfitPercent]}
                  onValueChange={([value]) => handleParamChange("takeProfitPercent", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Stop Loss: {(localParams.stopLossPercent * 100).toFixed(2)}%</Label>
                <Slider
                  id="stopLossPercent"
                  min={0.001}
                  max={0.03}
                  step={0.001}
                  value={[localParams.stopLossPercent]}
                  onValueChange={([value]) => handleParamChange("stopLossPercent", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Holding Time: {localParams.maxHoldingTimeMinutes} minutes</Label>
                <Slider
                  id="maxHoldingTimeMinutes"
                  min={5}
                  max={240}
                  step={5}
                  value={[localParams.maxHoldingTimeMinutes]}
                  onValueChange={([value]) => handleParamChange("maxHoldingTimeMinutes", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Leverage: {localParams.leverageMultiplier}x</Label>
                <Slider
                  id="leverageMultiplier"
                  min={1}
                  max={20}
                  step={1}
                  value={[localParams.leverageMultiplier]}
                  onValueChange={([value]) => handleParamChange("leverageMultiplier", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Trades Per Hour: {localParams.maxTradesPerHour}</Label>
                <Slider
                  id="maxTradesPerHour"
                  min={1}
                  max={20}
                  step={1}
                  value={[localParams.maxTradesPerHour]}
                  onValueChange={([value]) => handleParamChange("maxTradesPerHour", value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>EMA Threshold: {(localParams.emaThreshold * 100).toFixed(3)}%</Label>
                <Slider
                  id="emaThreshold"
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  value={[localParams.emaThreshold]}
                  onValueChange={([value]) => handleParamChange("emaThreshold", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>VWAP Threshold: {(localParams.vwapThreshold * 100).toFixed(3)}%</Label>
                <Slider
                  id="vwapThreshold"
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  value={[localParams.vwapThreshold]}
                  onValueChange={([value]) => handleParamChange("vwapThreshold", value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>MACD Fast</Label>
                  <Input
                    id="macdFastPeriod"
                    type="number"
                    min={5}
                    max={30}
                    value={localParams.macdFastPeriod}
                    onChange={(e) => handleParamChange("macdFastPeriod", Number.parseInt(e.target.value))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MACD Slow</Label>
                  <Input
                    id="macdSlowPeriod"
                    type="number"
                    min={10}
                    max={50}
                    value={localParams.macdSlowPeriod}
                    onChange={(e) => handleParamChange("macdSlowPeriod", Number.parseInt(e.target.value))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MACD Signal</Label>
                  <Input
                    id="macdSignalPeriod"
                    type="number"
                    min={5}
                    max={20}
                    value={localParams.macdSignalPeriod}
                    onChange={(e) => handleParamChange("macdSignalPeriod", Number.parseInt(e.target.value))}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isLoading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  )
}

export default StrategyParameters
