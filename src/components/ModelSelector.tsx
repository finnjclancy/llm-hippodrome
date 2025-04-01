import React, { useState } from 'react'
import { Model, MODEL_GROUPS } from '@/types/models'

interface ModelSelectorProps {
  models: Model[]
  toggleModel: (modelId: string) => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ models, toggleModel }) => {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [showSelectedModels, setShowSelectedModels] = useState(false)
  const [expanded, setExpanded] = useState(true) // For the entire model selector section

  // Split MODEL_GROUPS into columns
  const columns = [[], [], []] as typeof MODEL_GROUPS[]
  MODEL_GROUPS.forEach((group, index) => {
    columns[index % 3].push(group)
  })

  // Get selected models for a company
  const getSelectedModels = (company: string) => {
    return models.filter(model => model.company === company && model.selected)
  }

  // Toggle all models
  const toggleAllModels = () => {
    const allSelected = models.every(model => model.selected)
    models.forEach(model => {
      if (model.selected !== !allSelected) {
        toggleModel(model.id)
      }
    })
  }

  // Toggle all models for a specific company
  const toggleCompanyModels = (company: string) => {
    const companyModels = models.filter(model => model.company === company)
    const allCompanySelected = companyModels.every(model => model.selected)
    
    companyModels.forEach(model => {
      if (model.selected !== !allCompanySelected) {
        toggleModel(model.id)
      }
    })
  }

  const selectedModelsCount = models.filter(model => model.selected).length

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
      {/* Collapsible header */}
      <div 
        className="flex justify-between items-center mb-3 sm:mb-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <h2 className="text-lg sm:text-xl font-semibold">Select Models to Debate</h2>
          <span className="ml-2 text-gray-500 text-base sm:text-lg transition-transform duration-200">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
        <div className="flex items-center">
          <span className="mr-2 sm:mr-3 text-blue-600 font-medium text-sm sm:text-base">
            {selectedModelsCount} selected
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the parent div's onClick
              toggleAllModels();
            }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
          >
            {models.every(model => model.selected) ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <>
          <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4">Choose at least two models to participate in the debate.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="space-y-3 sm:space-y-4">
                {column.map((group) => {
                  const companyModels = models.filter(model => model.company === group.company)
                  const allCompanySelected = companyModels.every(model => model.selected)
                  
                  return (
                    <div key={group.company} className="border rounded-lg">
                      <div className="flex justify-between items-center px-3 sm:px-4 py-2 border-b">
                        <button
                          onClick={() => setExpandedCompany(expandedCompany === group.company ? null : group.company)}
                          className="flex-1 flex justify-between items-center hover:bg-gray-50 touch-manipulation"
                        >
                          <span className="font-medium text-sm sm:text-base">{group.company}</span>
                          <span className="text-gray-500">
                            {expandedCompany === group.company ? '▼' : '▶'}
                          </span>
                        </button>
                        <div className="flex items-center ml-2">
                          <input
                            type="checkbox"
                            checked={allCompanySelected}
                            onChange={() => toggleCompanyModels(group.company)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      
                      {expandedCompany === group.company && (
                        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                          {companyModels.map((model) => (
                            <label
                              key={model.id}
                              className="flex items-center space-x-2 sm:space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer touch-manipulation"
                            >
                              <input
                                type="checkbox"
                                checked={model.selected}
                                onChange={() => toggleModel(model.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm sm:text-base">{model.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <div className={`${expanded ? 'mt-4 sm:mt-6' : 'mt-2'} relative`}>
        <button
          onClick={() => setShowSelectedModels(!showSelectedModels)}
          className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border rounded-md bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 transition-all duration-300 shadow-sm touch-manipulation"
        >
          <span className="font-medium text-blue-700 text-sm sm:text-base">
            Selected Models ({selectedModelsCount})
          </span>
          <span className={`text-blue-500 transition-transform duration-300 ${showSelectedModels ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {showSelectedModels && (
          <div className="absolute z-10 mt-2 w-full bg-white border rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-auto">
            {models.filter(model => model.selected).length === 0 ? (
              <div className="px-3 sm:px-4 py-2 text-gray-500 text-sm sm:text-base">No models selected</div>
            ) : (
              models.filter(model => model.selected).map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between px-3 sm:px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div>
                    <span className="font-medium text-sm sm:text-base">{model.name}</span>
                    <span className="text-xs sm:text-sm text-gray-500 ml-2">({model.company})</span>
                  </div>
                  <button
                    onClick={() => toggleModel(model.id)}
                    className="text-red-500 hover:text-red-700 text-sm sm:text-base touch-manipulation"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
} 