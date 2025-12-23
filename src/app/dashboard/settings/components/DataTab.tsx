import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Download, HardDrive, AlertTriangle } from 'lucide-react'

export function DataTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>
        
        {/* Export Data Section */}
        <Card className="border-purple-100 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-purple-600" />
              <span>Export Data</span>
            </CardTitle>
            <CardDescription>Download a copy of all your data in JSON format</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              This will include your profile, settings, and all associated content.
            </p>
          </CardContent>
        </Card>

        {/* Storage Usage Section */}
        <Card className="border-purple-100 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-purple-600" />
              <span>Storage Usage</span>
            </CardTitle>
            <CardDescription>Monitor your account storage consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">2.4 GB of 5 GB</span>
              </div>
              <Progress value={48} className="h-2" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-lg font-semibold text-gray-900">1.2 GB</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Images</p>
                <p className="text-lg font-semibold text-gray-900">800 MB</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Other</p>
                <p className="text-lg font-semibold text-gray-900">400 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription className="text-red-600">
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button 
                  variant="destructive" 
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}