import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function NotificationsTab() {
  const notificationSettings = [
    {
      id: 'emailDigest',
      label: 'Email Digest',
      description: 'Receive a weekly summary of your activity',
      defaultChecked: true
    },
    {
      id: 'newFeatures',
      label: 'New Features',
      description: 'Get notified when we launch new features',
      defaultChecked: false
    },
    {
      id: 'weeklyReport',
      label: 'Weekly Report',
      description: 'Receive detailed analytics every week',
      defaultChecked: true
    },
    {
      id: 'smartSuggestions',
      label: 'Smart Suggestions',
      description: 'Get AI-powered recommendations and tips',
      defaultChecked: false
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
        
        <div className="space-y-6">
          {notificationSettings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div className="flex-1">
                <Label htmlFor={setting.id} className="text-base font-medium text-gray-900 cursor-pointer">
                  {setting.label}
                </Label>
                <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
              </div>
              <Switch 
                id={setting.id}
                defaultChecked={setting.defaultChecked}
                className="data-[state=checked]:bg-purple-600"
                style={{
                  '--switch-background': '#E9D5FF'
                } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}