import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

export function PreferencesTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Application Preferences</h2>
        
        {/* View Settings */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="libraryView">Default Library View</Label>
              <Select>
                <SelectTrigger className="focus:ring-purple-500 focus:border-purple-500">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid View</SelectItem>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="compact">Compact View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="itemsPerPage">Items Per Page</Label>
              <Select>
                <SelectTrigger className="focus:ring-purple-500 focus:border-purple-500">
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 items</SelectItem>
                  <SelectItem value="25">25 items</SelectItem>
                  <SelectItem value="50">50 items</SelectItem>
                  <SelectItem value="100">100 items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-6 mt-8">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="autoTagging" className="text-base font-medium text-gray-900 cursor-pointer">
                  Auto-tagging
                </Label>
                <p className="text-sm text-gray-500 mt-1">Automatically tag content based on AI analysis</p>
              </div>
              <Switch 
                id="autoTagging"
                className="data-[state=checked]:bg-purple-600"
              />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div className="flex-1">
                <Label htmlFor="smartSuggestions2" className="text-base font-medium text-gray-900 cursor-pointer">
                  Smart Suggestions
                </Label>
                <p className="text-sm text-gray-500 mt-1">Get intelligent recommendations while you work</p>
              </div>
              <Switch 
                id="smartSuggestions2"
                defaultChecked
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </div>

          {/* Theme Selector */}
          <div className="mt-8">
            <Label className="text-base font-medium text-gray-900 block mb-4">Theme</Label>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                className="flex items-center space-x-2 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <Sun className="h-4 w-4" />
                <span>Light Mode</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center space-x-2 border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <Moon className="h-4 w-4" />
                <span>Dark Mode</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}