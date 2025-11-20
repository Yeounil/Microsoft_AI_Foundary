"use client";

import { useState } from "react";
import { Bell, TrendingUp, Newspaper, BarChart3, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useNotificationSettingsStore } from "@/store/notification-settings-store";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/features/main/constants/stockCategories";

export default function SettingsPage() {
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    priceAlertsEnabled,
    setPriceAlertsEnabled,
    priceAlerts,
    addPriceAlert,
    deletePriceAlert,
    togglePriceAlert,
    newsAlertsEnabled,
    setNewsAlertsEnabled,
    newsAlertCategories,
    toggleNewsCategory,
    marketAlertsEnabled,
    setMarketAlertsEnabled,
    marketAlertThreshold,
    setMarketAlertThreshold,
  } = useNotificationSettingsStore();

  // 가격 알림 추가 폼 상태
  const [newAlertSymbol, setNewAlertSymbol] = useState("");
  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [newAlertCondition, setNewAlertCondition] = useState<"above" | "below">("above");

  const handleAddPriceAlert = () => {
    if (!newAlertSymbol || !newAlertPrice) return;

    addPriceAlert({
      symbol: newAlertSymbol.toUpperCase(),
      targetPrice: parseFloat(newAlertPrice),
      condition: newAlertCondition,
      isEnabled: true,
    });

    // 폼 초기화
    setNewAlertSymbol("");
    setNewAlertPrice("");
    setNewAlertCondition("above");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground">알림 및 앱 설정을 관리합니다.</p>
      </div>

      {/* 전역 알림 설정 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
          <CardDescription>모든 알림의 전역 설정입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications-enabled">알림 활성화</Label>
              <p className="text-sm text-muted-foreground">
                모든 알림을 켜거나 끕니다.
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* 가격 알림 설정 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            가격 알림
          </CardTitle>
          <CardDescription>
            종목의 목표 가격에 도달하면 알림을 받습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="price-alerts-enabled">가격 알림 활성화</Label>
            <Switch
              id="price-alerts-enabled"
              checked={priceAlertsEnabled}
              onCheckedChange={setPriceAlertsEnabled}
              disabled={!notificationsEnabled}
            />
          </div>

          <Separator />

          {/* 새 가격 알림 추가 */}
          <div className="space-y-3">
            <Label>새 가격 알림 추가</Label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                placeholder="종목 코드"
                value={newAlertSymbol}
                onChange={(e) => setNewAlertSymbol(e.target.value)}
                className="sm:col-span-1"
              />
              <Input
                type="number"
                placeholder="목표 가격"
                value={newAlertPrice}
                onChange={(e) => setNewAlertPrice(e.target.value)}
                className="sm:col-span-1"
              />
              <Select
                value={newAlertCondition}
                onValueChange={(v) => setNewAlertCondition(v as "above" | "below")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">이상</SelectItem>
                  <SelectItem value="below">이하</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddPriceAlert}
                disabled={!newAlertSymbol || !newAlertPrice}
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>
          </div>

          {/* 기존 가격 알림 목록 */}
          {priceAlerts.length > 0 && (
            <div className="space-y-2">
              <Label>등록된 알림</Label>
              {priceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.isEnabled}
                      onCheckedChange={() => togglePriceAlert(alert.id)}
                      disabled={!priceAlertsEnabled || !notificationsEnabled}
                    />
                    <div>
                      <p className="font-medium">{alert.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        ${alert.targetPrice} {alert.condition === "above" ? "이상" : "이하"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePriceAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 뉴스 알림 설정 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            뉴스 알림
          </CardTitle>
          <CardDescription>
            관심 카테고리의 새 뉴스가 등록되면 알림을 받습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="news-alerts-enabled">뉴스 알림 활성화</Label>
            <Switch
              id="news-alerts-enabled"
              checked={newsAlertsEnabled}
              onCheckedChange={setNewsAlertsEnabled}
              disabled={!notificationsEnabled}
            />
          </div>

          <Separator />

          {/* 카테고리 선택 */}
          <div className="space-y-3">
            <Label>알림 받을 카테고리</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_ORDER.map((category) => (
                <Button
                  key={category}
                  variant={newsAlertCategories.includes(category) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleNewsCategory(category)}
                  disabled={!newsAlertsEnabled || !notificationsEnabled}
                  className="justify-start"
                >
                  {CATEGORY_LABELS[category]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 시장 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            시장 알림
          </CardTitle>
          <CardDescription>
            주요 지수의 큰 변동이 있을 때 알림을 받습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="market-alerts-enabled">시장 알림 활성화</Label>
            <Switch
              id="market-alerts-enabled"
              checked={marketAlertsEnabled}
              onCheckedChange={setMarketAlertsEnabled}
              disabled={!notificationsEnabled}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>변동폭 기준 (%)</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={marketAlertThreshold}
                onChange={(e) => setMarketAlertThreshold(parseFloat(e.target.value) || 1)}
                className="w-24"
                disabled={!marketAlertsEnabled || !notificationsEnabled}
              />
              <p className="text-sm text-muted-foreground">
                지수가 {marketAlertThreshold}% 이상 변동 시 알림
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
